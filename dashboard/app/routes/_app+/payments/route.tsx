import { useState } from "react";
import { Button } from "#assets/components/ui/button.tsx";
import { Input } from "#assets/components/ui/input.tsx";
import { Badge } from "#assets/components/ui/badge.tsx";
import { trpc } from "#dashboard/app/lib/trpc.tsx";

export default function PaymentsPage() {
	const utils = trpc.useUtils();

	// Fetch payments list
	const { data: paymentsList, isLoading, refetch } = trpc.payments.list.useQuery(undefined, {
		refetchOnMount: "stale",
	});

	// Create payment mutation
	const createMutation = trpc.payments.create.useMutation({
		onSuccess: async () => {
			// Clear form immediately
			setAmount("");
			setRecipientEmail("");
			setDescription("");
			// Invalidate and refetch the list
			await utils.payments.list.invalidate();
		},
	});

	// Form state
	const [amount, setAmount] = useState("");
	const [recipientEmail, setRecipientEmail] = useState("");
	const [description, setDescription] = useState("");

	// Handle form submission
	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		createMutation.mutate({
			amount: Math.round(parseFloat(amount) * 100), // Convert dollars to cents
			recipientEmail,
			description: description || undefined,
		});
	};

	// Format amount from cents to dollars
	const formatAmount = (cents: number) => {
		return (cents / 100).toFixed(2);
	};

	// Format date
	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString();
	};

	// Get status color
	const getStatusColor = (status: string) => {
		switch (status) {
			case "completed":
				return "bg-green-100 text-green-800";
			case "pending":
				return "bg-yellow-100 text-yellow-800";
			case "processing":
				return "bg-blue-100 text-blue-800";
			case "failed":
				return "bg-red-100 text-red-800";
			default:
				return "bg-gray-100 text-gray-800";
		}
	};

	return (
		<div className="space-y-8">
			<div>
				<h1 className="text-2xl font-bold text-gray-900">Payments</h1>
				<p className="mt-1 text-sm text-gray-500">
					Create and manage your payments
				</p>
			</div>

			{/* Create Payment Form */}
			<div className="rounded-lg border bg-white p-6">
				<h2 className="text-lg font-medium text-gray-900">Create Payment</h2>
				<form onSubmit={handleSubmit} className="mt-6 space-y-4">
					<div>
						<label className="block text-sm font-medium text-gray-700">
							Amount (USD)
						</label>
						<Input
							type="number"
							step="0.01"
							min="0"
							placeholder="100.00"
							value={amount}
							onChange={(e) => setAmount(e.target.value)}
							required
						/>
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-700">
							Recipient Email
						</label>
						<Input
							type="email"
							placeholder="recipient@example.com"
							value={recipientEmail}
							onChange={(e) => setRecipientEmail(e.target.value)}
							required
						/>
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-700">
							Description (Optional)
						</label>
						<Input
							type="text"
							placeholder="Payment description"
							value={description}
							onChange={(e) => setDescription(e.target.value)}
						/>
					</div>

					<Button
						type="submit"
						disabled={createMutation.isPending || !amount || !recipientEmail}
						className="w-full"
					>
						{createMutation.isPending ? "Creating..." : "Create Payment"}
					</Button>

					{createMutation.isError && (
						<p className="text-sm text-red-600">
							Error: {createMutation.error.message}
						</p>
					)}
				</form>
			</div>

			{/* Payment History Table */}
			<div className="rounded-lg border bg-white p-6">
				<h2 className="text-lg font-medium text-gray-900">Payment History</h2>

				{isLoading ? (
					<p className="mt-4 text-gray-500">Loading payments...</p>
				) : !paymentsList || paymentsList.length === 0 ? (
					<p className="mt-4 text-gray-500">No payments yet.</p>
				) : (
					<div className="mt-6 overflow-x-auto">
						<table className="w-full text-sm">
							<thead>
								<tr className="border-b">
									<th className="px-4 py-3 text-left font-medium text-gray-700">
										Recipient
									</th>
									<th className="px-4 py-3 text-left font-medium text-gray-700">
										Amount
									</th>
									<th className="px-4 py-3 text-left font-medium text-gray-700">
										Status
									</th>
									<th className="px-4 py-3 text-left font-medium text-gray-700">
										Description
									</th>
									<th className="px-4 py-3 text-left font-medium text-gray-700">
										Date
									</th>
								</tr>
							</thead>
							<tbody>
								{paymentsList.map((payment) => (
									<tr key={payment.id} className="border-b hover:bg-gray-50">
										<td className="px-4 py-3 text-gray-900">
											{payment.recipientEmail}
										</td>
										<td className="px-4 py-3 text-gray-900">
											${formatAmount(payment.amount)}
										</td>
										<td className="px-4 py-3">
											<Badge className={getStatusColor(payment.status)}>
												{payment.status}
											</Badge>
										</td>
										<td className="px-4 py-3 text-gray-600">
											{payment.description || "-"}
										</td>
										<td className="px-4 py-3 text-gray-600">
											{formatDate(payment.createdAt)}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</div>
		</div>
	);
}
