import { z } from "zod";
import { updatePaymentStatus } from "#api/services/payments.ts";
import {
	defineOpenAPI,
	defineOpenAPIEndpoint,
} from "#api/primitives/openapi.ts";
import { verifyWebhookSignature } from "#api/lib/webhooks/verify.ts";

const WebhookEventSchema = z.object({
	id: z.string(),
	type: z.literal("payment.status_changed"),
	data: z.object({
		paymentId: z.string(),
		newStatus: z.enum(["processing", "completed", "failed"]),
		previousStatus: z.enum(["pending", "processing"]),
	}),
});

/**
 * Webhook handler for payment status updates from external provider.
 *
 * Verifies the webhook signature and updates the payment status in the database.
 */
export default defineOpenAPI({
	POST: defineOpenAPIEndpoint({
		summary: "Handle payment status webhook",
		requestBody: WebhookEventSchema,
		responses: {
			200: {
				description: "Webhook processed",
				schema: z.object({ received: z.boolean() }),
			},
			401: {
				description: "Invalid signature",
				schema: z.object({ error: z.string() }),
			},
			400: {
				description: "Invalid request",
				schema: z.object({ error: z.string() }),
			},
		},
		async handler({ ctx, body, request, response }) {
			// Verify webhook signature
			const signature = request.headers["x-webhook-signature"] as string;
			const webhookSecret = ctx.container.config.WEBHOOK_SECRET;

			const isValid = verifyWebhookSignature(
				(request as any).rawBody,
				signature,
				webhookSecret,
			);

			if (!isValid) {
				return response.unauthorized({ error: "Invalid signature" });
			}

			// Update payment status in database
			try {
				await updatePaymentStatus(ctx, body.data.paymentId, body.data.newStatus);
				ctx.container.logger.info(
					`Webhook processed: Payment ${body.data.paymentId} status updated to ${body.data.newStatus}`,
				);
				return response.ok({ received: true });
			} catch (error) {
				ctx.container.logger.error("Webhook handler error", { error });
				return response.badRequest({ error: "Failed to process webhook" });
			}
		},
	}),
});
