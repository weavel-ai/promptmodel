export const PRODUCT_NAME = "Promptmodel";

export class Routes {
  // static PAST_EXAMS: string = "/past-exams"
  // static CREATE_ANSWER: string = "/create"
}

export class env {
  static SELF_HOSTED: boolean = process.env.NEXT_PUBLIC_SELF_HOSTED == "true";
  static ENDPOINT_URL_INTERNAL: string =
    process.env.NEXT_PUBLIC_ENDPOINT_URL.includes("localhost")
      ? "http://localhost:8000/api"
      : // "https://backend:8000/api"
        process.env.NEXT_PUBLIC_ENDPOINT_URL;

  static ENDPOINT_URL: string = process.env.NEXT_PUBLIC_ENDPOINT_URL;

  static SUPABASE_URL: string = process.env.NEXT_PUBLIC_SUPABASE_URL;
  static SUPABASE_KEY: string = process.env.NEXT_PUBLIC_SUPABASE_KEY;
  static AMPLITUDE_API_KEY: string = process.env.NEXT_PUBLIC_AMPLITUDE_API_KEY;

  // Variables below are used for self-hosted instances
  static NEXTAUTH_URL: string = process.env.NEXTAUTH_URL;
  static NEXTAUTH_SECRET: string = process.env.NEXTAUTH_SECRET;
  static ORG_NAME: string = process.env.NEXT_PUBLIC_ORG_NAME ?? "admin";
  static ORG_SLUG: string = process.env.NEXT_PUBLIC_ORG_SLUG ?? "admin";

  static AUTH_GOOGLE_CLIENT_ID: string | null =
    process.env.NEXT_PUBLIC_AUTH_GOOGLE_CLIENT_ID || null;
  static AUTH_GOOGLE_CLIENT_SECRET: string | null =
    process.env.NEXT_PUBLIC_AUTH_GOOGLE_CLIENT_SECRET || null;
  static AUTH_GITHUB_CLIENT_ID: string | null =
    process.env.NEXT_PUBLIC_AUTH_GITHUB_CLIENT_ID || null;
  static AUTH_GITHUB_CLIENT_SECRET: string | null =
    process.env.NEXT_PUBLIC_AUTH_GITHUB_CLIENT_SECRET || null;
}

export interface LLMProvider {
  label: string;
  name: string;
  logoPath?: string | null;
  requiredEnvVars?: string[];
  requiredParams?: string[];
  cloudUnsupported?: boolean;
}

export const LLMProviders: LLMProvider[] = [
  {
    label: "OpenAI",
    name: "openai",
    logoPath: "/logos/openai-logo.svg",
    requiredEnvVars: ["OPENAI_API_KEY"],
  },
  {
    label: "Azure OpenAI",
    name: "azure",
    requiredEnvVars: ["AZURE_API_KEY", "AZURE_API_BASE", "AZURE_API_VERSION"],
  },
  {
    label: "Huggingface",
    name: "huggingface",
    requiredEnvVars: ["HUGGINGFACE_API_KEY"],
    requiredParams: ["model", "api_base"],
  },
  {
    label: "Ollama",
    name: "ollama",
    requiredParams: ["model", "api_base"],
  },
  {
    label: "VertexAI - Google [Gemini]",
    name: "vertex_ai",
    requiredEnvVars: ["VERTEXAI_PROJECT", "VERTEXAI_LOCATION"],
    cloudUnsupported: true,
  },
  {
    label: "PaLM API - Google",
    name: "palm",
    requiredEnvVars: ["PALM_API_KEY"],
  },
  {
    label: "Mistral AI",
    name: "mistral",
    requiredEnvVars: ["MISTRAL_API_KEY"],
  },
  {
    label: "Anthropic",
    name: "anthropic",
    logoPath: "/logos/anthropic-logo.svg",
    requiredEnvVars: ["ANTHROPIC_API_KEY"],
  },
  {
    label: "AWS Sagemaker",
    name: "sagemaker",
    requiredEnvVars: [
      "AWS_ACCESS_KEY_ID",
      "AWS_SECRET_ACCESS_KEY",
      "AWS_REGION_NAME",
    ],
  },
  {
    label: "AWS Bedrock",
    name: "bedrock",
    requiredEnvVars: [
      "AWS_ACCESS_KEY_ID",
      "AWS_SECRET_ACCESS_KEY",
      "AWS_REGION_NAME",
    ],
  },
  {
    label: "Anyscale",
    name: "anyscale",
    requiredEnvVars: ["ANYSCALE_API_KEY"],
  },
  {
    label: "Perplexity AI",
    name: "perplexity",
    requiredEnvVars: ["PERPLEXITYAI_API_KEY"],
  },
  {
    label: "VLLM",
    name: "vllm",
    requiredParams: ["model", "api_base"],
  },
  {
    label: "DeepInfra",
    name: "deepinfra",
    requiredEnvVars: ["DEEPINFRA_API_KEY"],
  },
  {
    label: "AI21",
    name: "ai21",
    requiredEnvVars: ["AI21_API_KEY"],
  },
  {
    label: "NLP Cloud",
    name: "nlp_cloud",
    requiredEnvVars: ["NLP_CLOUD_API_KEY"],
  },
  {
    label: "Replicate",
    name: "replicate",
    requiredEnvVars: ["REPLICATE_API_KEY"],
  },
  {
    label: "Cohere",
    name: "cohere",
    logoPath: "/logos/cohere-logo.svg",
    requiredEnvVars: ["COHERE_API_KEY"],
  },
  {
    label: "Together AI",
    name: "together_ai",
    requiredEnvVars: ["TOGETHERAI_API_KEY"],
  },
  {
    label: "Aleph Alpha",
    name: "aleph_alpha",
    requiredEnvVars: ["ALEPHALPHA_API_KEY"],
  },
  {
    label: "Baseten",
    name: "baseten",
    requiredEnvVars: ["BASETEN_API_KEY"],
  },
  {
    label: "OpenRouter",
    name: "openrouter",
    requiredEnvVars: ["OPENROUTER_API_KEY"],
  },
];
