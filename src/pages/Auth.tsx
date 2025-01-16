import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Auth as SupabaseAuth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { AuthError, AuthApiError } from "@supabase/supabase-js";

const Auth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check if user is already authenticated
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/");
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        navigate("/");
      }
      
      if (event === "SIGNED_OUT") {
        navigate("/auth");
      }

      // Handle auth errors
      if (event === "USER_UPDATED" || event === "SIGNED_IN") {
        supabase.auth.getSession().then(({ error }) => {
          if (error) {
            const message = getErrorMessage(error);
            toast({
              variant: "destructive",
              title: "Authentication Error",
              description: message,
            });
          }
        });
      }
    });

    // Listen for auth state changes to catch sign-in errors
    const authListener = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT' || event === 'SIGNED_IN') {
        const { error } = await supabase.auth.getSession();
        if (error) {
          const message = getErrorMessage(error);
          toast({
            variant: "destructive",
            title: "Authentication Error",
            description: message,
          });
        }
      }
    });

    return () => {
      subscription.unsubscribe();
      authListener.data.subscription.unsubscribe();
    };
  }, [navigate, toast]);

  const getErrorMessage = (error: AuthError) => {
    if (error instanceof AuthApiError) {
      switch (error.message) {
        case "Password should be at least 6 characters.":
          return "Password must be at least 6 characters long.";
        case "weak_password":
          return "Please choose a stronger password (minimum 6 characters).";
        case "Invalid login credentials":
          return "Invalid email or password. Please check your credentials and try again.";
        case "invalid_credentials":
          return "Invalid email or password. Please check your credentials.";
        case "email_not_confirmed":
          return "Please verify your email address before signing in.";
        case "user_not_found":
          return "No user found with these credentials.";
        default:
          return error.message;
      }
    }
    return error.message;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Welcome</CardTitle>
        </CardHeader>
        <CardContent>
          <SupabaseAuth 
            supabaseClient={supabase}
            appearance={{ 
              theme: ThemeSupa,
              variables: {
                default: {
                  colors: {
                    brand: 'rgb(var(--foreground))',
                    brandAccent: 'rgb(var(--primary))'
                  }
                }
              },
              style: {
                input: {
                  borderRadius: '0.375rem',
                },
                message: {
                  color: 'rgb(var(--destructive))',
                  marginBottom: '0.5rem',
                },
                container: {
                  gap: '1rem',
                },
                button: {
                  borderRadius: '0.375rem',
                  padding: '0.5rem 1rem',
                },
                anchor: {
                  color: 'rgb(var(--primary))',
                }
              }
            }}
            providers={[]}
            localization={{
              variables: {
                sign_up: {
                  password_label: 'Password (minimum 6 characters)',
                  email_label: 'Email',
                  button_label: 'Create Account',
                },
                sign_in: {
                  password_label: 'Password',
                  email_label: 'Email',
                  button_label: 'Sign In',
                }
              }
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;