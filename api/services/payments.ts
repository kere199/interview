import { desc, eq } from "drizzle-orm";
import { payments, type PaymentStatus } from "#api/databases/schema.ts";
import type { AppContext } from "#api/primitives/app-context.ts";

/**
 * Get a payment by ID. Returns the payment if found, null otherwise.
 */
export async function getPaymentById(ctx: AppContext, paymentId: string) {
	const payment = await ctx.container.db
		.select()
		.from(payments)
		.where(eq(payments.id, paymentId))
		.limit(1)
		.then((rows) => rows[0]);

	return payment ?? null;
}

/**
 * List all payments for the current user, sorted by most recent first.
 */
export async function listPaymentsByUser(ctx: AppContext) {
	const paymentsList = await ctx.container.db
		.select()
		.from(payments)
		.where(eq(payments.createdBy, ctx.user.id))
		.orderBy(desc(payments.createdAt))
		.execute();

	return paymentsList;
}

/**
 * Create a new payment for the current user.
 */
export async function createPayment(
	ctx: AppContext,
	data: {
		amount: number;
		recipientEmail: string;
		description?: string;
	},
) {
	const [payment] = await ctx.container.db
		.insert(payments)
		.values({
			amount: data.amount,
			recipientEmail: data.recipientEmail,
			description: data.description,
			createdBy: ctx.user.id,
		})
		.returning();

	return payment;
}

/**
 * Update payment status. Used by webhooks to reflect external payment status.
 */
export async function updatePaymentStatus(
	ctx: AppContext,
	paymentId: string,
	newStatus: PaymentStatus,
) {
	const [payment] = await ctx.container.db
		.update(payments)
		.set({ status: newStatus })
		.where(eq(payments.id, paymentId))
		.returning();

	return payment;
}
