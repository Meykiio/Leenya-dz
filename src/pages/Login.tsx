import LoginForm from "@/components/auth/LoginForm";

/**
 * Login page — renders the authentication form centered on screen.
 * @returns The login page JSX
 */
const Login = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <LoginForm />
    </div>
  );
};

export default Login;
