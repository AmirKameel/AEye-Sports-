import SignUpForm from '@/components/auth/SignUpForm';

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">AEye Sport</h1>
          <p className="text-gray-600">Tennis Academy Management Platform</p>
        </div>
        <SignUpForm />
      </div>
    </div>
  );
}