import { Link } from "react-router-dom";

const NotFound = () => {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-cursor-editor px-4">
      <h1 className="text-2xl font-semibold text-cursor-text">Page not found</h1>
      <p className="text-sm text-cursor-text-muted">
        The page you’re looking for doesn’t exist or has been moved.
      </p>
      <Link
        to="/"
        className="rounded bg-cursor-accent px-4 py-2 text-sm text-black hover:opacity-90"
      >
        Back to Jollof
      </Link>
    </div>
  );
};

export default NotFound;
