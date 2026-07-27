import { CheckCircle } from "lucide-react";
import Link from "next/link";

export default function PaySuccessPage({
  searchParams,
}: {
  searchParams: { invoice?: string };
}) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-lg max-w-md w-full p-8 text-center">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-9 h-9 text-emerald-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Received!</h1>
        {searchParams.invoice && (
          <p className="text-sm text-gray-500 mb-1">Invoice {searchParams.invoice}</p>
        )}
        <p className="text-gray-600 mb-8">
          Thank you for your payment. A confirmation has been sent to your email. We look forward to serving you again!
        </p>
        <Link
          href="/"
          className="inline-block bg-blue-600 text-white font-semibold px-6 py-3 rounded-xl hover:bg-blue-700 transition-colors"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}
