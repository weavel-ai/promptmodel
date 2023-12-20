import { env } from "@/constants";
import { useOrganization as useClerkOrganization } from "@clerk/nextjs";

type NextOrganization = {
  id: string;
  name: string;
  slug: string | null;
};

type NextOrgReturn = {
  isLoaded: boolean;
  organization: NextOrganization;
  //   Clerk return types
  membership?: any;
  domains?: any;
  membershipRequests?: any;
  invitations?: any;
  memberships?: any;
};

function useNextOrganization(): NextOrgReturn {
  return {
    isLoaded: true,
    organization: {
      id: "org_selfhosted",
      name: env.ORG_NAME,
      slug: env.ORG_SLUG,
    },
  };
}

export const useOrganization = env.SELF_HOSTED
  ? useNextOrganization
  : useClerkOrganization;

// export function useOrganization() {
//   return env.SELF_HOSTED ? useNextOrganization() : useClerkOrganization();
// }
