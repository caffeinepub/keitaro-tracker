import { Skeleton } from "@/components/ui/skeleton";
import { Toaster } from "@/components/ui/sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import Layout from "./components/Layout";
import ProfileSetupModal from "./components/ProfileSetupModal";
import { useEmailAuth } from "./contexts/EmailAuthContext";
import { useInternetIdentity } from "./hooks/useInternetIdentity";
import { useGetCallerUserProfile } from "./hooks/useQueries";

export default function App() {
  const { identity, isInitializing: iiInitializing } = useInternetIdentity();
  const { emailUser, isInitializing: emailInitializing } = useEmailAuth();
  const queryClient = useQueryClient();
  const [profileSetupDone, setProfileSetupDone] = useState(false);

  const isInitializing = iiInitializing || emailInitializing;

  const {
    data: userProfile,
    isLoading: profileLoading,
    isFetched,
  } = useGetCallerUserProfile();

  // Only show profile setup for Internet Identity users
  const showProfileSetup =
    !!identity &&
    !emailUser &&
    !profileLoading &&
    isFetched &&
    userProfile === null &&
    !profileSetupDone;

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
    );
  }

  return (
    <>
      <Layout
        userProfile={userProfile}
        emailUser={emailUser}
        onLogout={() => {
          queryClient.clear();
        }}
      />
      {showProfileSetup && (
        <ProfileSetupModal onComplete={() => setProfileSetupDone(true)} />
      )}
      <Toaster theme="dark" />
    </>
  );
}
