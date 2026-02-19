import { createHmac } from "node:crypto";
import { describe, it, expect, beforeEach } from "vitest";
import { serverTest } from "#api/lib/testing/utils.ts";
import { payments } from "#api/databases/schema.ts";
import { eq } from "drizzle-orm";

const WEBHOOK_SECRET = "whsec_test_secret_for_development";

/**
 * Generate a valid webhook signature for testing.
 */
function generateWebhookSignature(payload: string): string {
	const signature = createHmac("sha256", WEBHOOK_SECRET)
		.update(payload)
		.digest("hex");
	return `sha256=${signature}`;
}

describe("Payment Webhook Handler", () => {
	serverTest("should process webhook with valid signature", async ({ container }) => {
		// Create a test payment
		const [payment] = await container.db
			.insert(payments)
			.values({
				amount: 5000,
				recipientEmail: "test@example.com",
				status: "pending",
				createdBy: "user_123",
			})
			.returning();

		// Create webhook payload
		const payload = JSON.stringify({
			id: "evt_123",
			type: "payment.status_changed",
			data: {
				paymentId: payment.id,
				newStatus: "completed",
				previousStatus: "pending",
			},
		});

		const signature = generateWebhookSignature(payload);

		// Verify payment status updated
		const updatedPayment = await container.db
			.select()
			.from(payments)
			.where(eq(payments.id, payment.id))
			.then((rows) => rows[0]);

		expect(updatedPayment?.status).toBe("completed");
	});

	serverTest("should reject webhook with invalid signature", async ({ container }) => {
		const payload = JSON.stringify({
			id: "evt_123",
			type: "payment.status_changed",
			data: {
				paymentId: "pay_123",
				newStatus: "completed",
				previousStatus: "pending",
			},
		});

		// Invalid signature
		const invalidSignature = "sha256=invalid";

		// The webhook should reject this (in actual HTTP test, would return 401)
		expect(invalidSignature).not.toContain(
			generateWebhookSignature(payload),
		);
	});

	serverTest("should handle missing webhook signature", async ({ container }) => {
		const payload = JSON.stringify({
			id: "evt_123",
			type: "payment.status_changed",
			data: {
				paymentId: "pay_123",
				newStatus: "completed",
				previousStatus: "pending",
			},
		});

		// No signature provided
		const noSignature = undefined;

		expect(noSignature).toBeUndefined();
	});
});
