import { XCircle } from "lucide-react";
import Link from "next/link";

export default function PayCancelledPage({
  searchParams,
}: {
  searchParams: { invoice?: string };
}) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-lg max-w-md w-full p-8 text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <XCircle className="w-9 h-9 text-red-500" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Cancelled</h1>
        {searchParams.invoice && (
          <p className="text-sm text-gray-500 mb-1">Invoice {searchParams.invoice}</p>
        )}
        <p className="text-gray-600 mb-8">
          No charge was made. If you have questions about your invoice, please contact us and we will be happy to help.
        </p>
        <Link
          href="/"
          className="inline-block bg-gray-800 text-white font-semibold px-6 py-3 rounded-xl hover:bg-gray-900 transition-colors"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}
