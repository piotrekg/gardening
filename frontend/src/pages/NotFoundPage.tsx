import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="card mx-auto max-w-md p-10 text-center">
      <p className="text-5xl" aria-hidden="true">
        🥀
      </p>
      <h1 className="mt-4 text-xl font-bold text-gray-900">Page not found</h1>
      <p className="mt-2 text-sm text-gray-500">
        This corner of the garden doesn't exist. Let's get you back to greener paths.
      </p>
      <Link to="/dashboard" className="btn-primary mt-6 inline-flex">
        Back to dashboard
      </Link>
    </div>
  );
}
