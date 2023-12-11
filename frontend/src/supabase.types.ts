export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      chat_log: {
        Row: {
          content: string | null;
          cost: number | null;
          created_at: string;
          id: number;
          latency: number | null;
          metadata: Json | null;
          role: string | null;
          session_uuid: string | null;
          token_usage: Json | null;
          tool_calls: Json | null;
        };
        Insert: {
          content?: string | null;
          cost?: number | null;
          created_at?: string;
          id?: number;
          latency?: number | null;
          metadata?: Json | null;
          role?: string | null;
          session_uuid?: string | null;
          token_usage?: Json | null;
          tool_calls?: Json | null;
        };
        Update: {
          content?: string | null;
          cost?: number | null;
          created_at?: string;
          id?: number;
          latency?: number | null;
          metadata?: Json | null;
          role?: string | null;
          session_uuid?: string | null;
          token_usage?: Json | null;
          tool_calls?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: "chat_log_session_uuid_fkey";
            columns: ["session_uuid"];
            isOneToOne: false;
            referencedRelation: "chat_log_session";
            referencedColumns: ["uuid"];
          }
        ];
      };
      chat_log_session: {
        Row: {
          created_at: string;
          dev_branch_uuid: string | null;
          id: number;
          run_from_deployment: boolean | null;
          uuid: string | null;
          version_uuid: string | null;
        };
        Insert: {
          created_at?: string;
          dev_branch_uuid?: string | null;
          id?: number;
          run_from_deployment?: boolean | null;
          uuid?: string | null;
          version_uuid?: string | null;
        };
        Update: {
          created_at?: string;
          dev_branch_uuid?: string | null;
          id?: number;
          run_from_deployment?: boolean | null;
          uuid?: string | null;
          version_uuid?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "chat_log_session_dev_branch_uuid_fkey";
            columns: ["dev_branch_uuid"];
            isOneToOne: false;
            referencedRelation: "dev_branch";
            referencedColumns: ["uuid"];
          },
          {
            foreignKeyName: "chat_log_session_version_uuid_fkey";
            columns: ["version_uuid"];
            isOneToOne: false;
            referencedRelation: "chat_model_version";
            referencedColumns: ["uuid"];
          }
        ];
      };
      chat_model: {
        Row: {
          created_at: string;
          dev_branch_uuid: string | null;
          id: number;
          name: string | null;
          project_uuid: string | null;
          uuid: string | null;
        };
        Insert: {
          created_at?: string;
          dev_branch_uuid?: string | null;
          id?: number;
          name?: string | null;
          project_uuid?: string | null;
          uuid?: string | null;
        };
        Update: {
          created_at?: string;
          dev_branch_uuid?: string | null;
          id?: number;
          name?: string | null;
          project_uuid?: string | null;
          uuid?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "chat_model_dev_branch_uuid_fkey";
            columns: ["dev_branch_uuid"];
            isOneToOne: false;
            referencedRelation: "dev_branch";
            referencedColumns: ["uuid"];
          },
          {
            foreignKeyName: "chat_model_project_uuid_fkey";
            columns: ["project_uuid"];
            isOneToOne: false;
            referencedRelation: "daily_project_run_log_metric";
            referencedColumns: ["project_uuid"];
          },
          {
            foreignKeyName: "chat_model_project_uuid_fkey";
            columns: ["project_uuid"];
            isOneToOne: false;
            referencedRelation: "project";
            referencedColumns: ["uuid"];
          }
        ];
      };
      chat_model_version: {
        Row: {
          chat_model_uuid: string | null;
          created_at: string;
          dev_branch_uuid: string | null;
          dev_from_uuid: string | null;
          from_uuid: string | null;
          functions: string[] | null;
          id: number;
          is_ab_test: boolean | null;
          is_deployed: boolean | null;
          is_published: boolean | null;
          model: string | null;
          ratio: number | null;
          status: string | null;
          system_prompt: string | null;
          uuid: string | null;
          version: number | null;
        };
        Insert: {
          chat_model_uuid?: string | null;
          created_at?: string;
          dev_branch_uuid?: string | null;
          dev_from_uuid?: string | null;
          from_uuid?: string | null;
          functions?: string[] | null;
          id?: number;
          is_ab_test?: boolean | null;
          is_deployed?: boolean | null;
          is_published?: boolean | null;
          model?: string | null;
          ratio?: number | null;
          status?: string | null;
          system_prompt?: string | null;
          uuid?: string | null;
          version?: number | null;
        };
        Update: {
          chat_model_uuid?: string | null;
          created_at?: string;
          dev_branch_uuid?: string | null;
          dev_from_uuid?: string | null;
          from_uuid?: string | null;
          functions?: string[] | null;
          id?: number;
          is_ab_test?: boolean | null;
          is_deployed?: boolean | null;
          is_published?: boolean | null;
          model?: string | null;
          ratio?: number | null;
          status?: string | null;
          system_prompt?: string | null;
          uuid?: string | null;
          version?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "chat_model_version_chat_model_uuid_fkey";
            columns: ["chat_model_uuid"];
            isOneToOne: false;
            referencedRelation: "chat_model";
            referencedColumns: ["uuid"];
          },
          {
            foreignKeyName: "chat_model_version_dev_branch_uuid_fkey";
            columns: ["dev_branch_uuid"];
            isOneToOne: false;
            referencedRelation: "dev_branch";
            referencedColumns: ["uuid"];
          }
        ];
      };
      cli_access: {
        Row: {
          api_key: string | null;
          created_at: string;
          expires_at: string | null;
          user_id: string;
        };
        Insert: {
          api_key?: string | null;
          created_at?: string;
          expires_at?: string | null;
          user_id: string;
        };
        Update: {
          api_key?: string | null;
          created_at?: string;
          expires_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "cli_access_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "user";
            referencedColumns: ["user_id"];
          }
        ];
      };
      dev_branch: {
        Row: {
          cli_access_key: string | null;
          cloud: boolean | null;
          created_at: string;
          id: number;
          name: string | null;
          online: boolean | null;
          project_uuid: string | null;
          sync: boolean | null;
          uuid: string | null;
        };
        Insert: {
          cli_access_key?: string | null;
          cloud?: boolean | null;
          created_at?: string;
          id?: number;
          name?: string | null;
          online?: boolean | null;
          project_uuid?: string | null;
          sync?: boolean | null;
          uuid?: string | null;
        };
        Update: {
          cli_access_key?: string | null;
          cloud?: boolean | null;
          created_at?: string;
          id?: number;
          name?: string | null;
          online?: boolean | null;
          project_uuid?: string | null;
          sync?: boolean | null;
          uuid?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "dev_branch_cli_access_key_fkey";
            columns: ["cli_access_key"];
            isOneToOne: false;
            referencedRelation: "cli_access";
            referencedColumns: ["api_key"];
          },
          {
            foreignKeyName: "dev_branch_project_uuid_fkey";
            columns: ["project_uuid"];
            isOneToOne: false;
            referencedRelation: "daily_project_run_log_metric";
            referencedColumns: ["project_uuid"];
          },
          {
            foreignKeyName: "dev_branch_project_uuid_fkey";
            columns: ["project_uuid"];
            isOneToOne: false;
            referencedRelation: "project";
            referencedColumns: ["uuid"];
          }
        ];
      };
      organization: {
        Row: {
          created_at: string;
          id: number;
          name: string | null;
          organization_id: string | null;
          slug: string | null;
        };
        Insert: {
          created_at?: string;
          id?: number;
          name?: string | null;
          organization_id?: string | null;
          slug?: string | null;
        };
        Update: {
          created_at?: string;
          id?: number;
          name?: string | null;
          organization_id?: string | null;
          slug?: string | null;
        };
        Relationships: [];
      };
      parsing_type: {
        Row: {
          id: number;
          type: string;
        };
        Insert: {
          id?: number;
          type: string;
        };
        Update: {
          id?: number;
          type?: string;
        };
        Relationships: [];
      };
      project: {
        Row: {
          api_key: string | null;
          created_at: string;
          description: string | null;
          id: number;
          name: string | null;
          organization_id: string | null;
          uuid: string | null;
          version: string | null;
        };
        Insert: {
          api_key?: string | null;
          created_at?: string;
          description?: string | null;
          id?: number;
          name?: string | null;
          organization_id?: string | null;
          uuid?: string | null;
          version?: string | null;
        };
        Update: {
          api_key?: string | null;
          created_at?: string;
          description?: string | null;
          id?: number;
          name?: string | null;
          organization_id?: string | null;
          uuid?: string | null;
          version?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "project_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organization";
            referencedColumns: ["organization_id"];
          },
          {
            foreignKeyName: "project_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "user_organizations";
            referencedColumns: ["organization_id"];
          }
        ];
      };
      project_changelog: {
        Row: {
          created_at: string;
          id: number;
          level: number;
          logs: Json[];
          previous_version: string;
          project_uuid: string | null;
        };
        Insert: {
          created_at?: string;
          id?: number;
          level?: number;
          logs?: Json[];
          previous_version: string;
          project_uuid?: string | null;
        };
        Update: {
          created_at?: string;
          id?: number;
          level?: number;
          logs?: Json[];
          previous_version?: string;
          project_uuid?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "project_changelog_project_uuid_fkey";
            columns: ["project_uuid"];
            isOneToOne: false;
            referencedRelation: "daily_project_run_log_metric";
            referencedColumns: ["project_uuid"];
          },
          {
            foreignKeyName: "project_changelog_project_uuid_fkey";
            columns: ["project_uuid"];
            isOneToOne: false;
            referencedRelation: "project";
            referencedColumns: ["uuid"];
          }
        ];
      };
      prompt: {
        Row: {
          content: string | null;
          created_at: string;
          id: number;
          role: string;
          step: number;
          version_uuid: string | null;
        };
        Insert: {
          content?: string | null;
          created_at?: string;
          id?: number;
          role: string;
          step?: number;
          version_uuid?: string | null;
        };
        Update: {
          content?: string | null;
          created_at?: string;
          id?: number;
          role?: string;
          step?: number;
          version_uuid?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "prompt_version_uuid_fkey";
            columns: ["version_uuid"];
            isOneToOne: false;
            referencedRelation: "deployed_function_model_version";
            referencedColumns: ["uuid"];
          },
          {
            foreignKeyName: "prompt_version_uuid_fkey";
            columns: ["version_uuid"];
            isOneToOne: false;
            referencedRelation: "deployment_run_log_view";
            referencedColumns: ["function_model_version_uuid"];
          },
          {
            foreignKeyName: "prompt_version_uuid_fkey";
            columns: ["version_uuid"];
            isOneToOne: false;
            referencedRelation: "function_model_version";
            referencedColumns: ["uuid"];
          }
        ];
      };
      function_model: {
        Row: {
          created_at: string;
          dev_branch_uuid: string | null;
          id: number;
          name: string;
          project_uuid: string | null;
          uuid: string | null;
        };
        Insert: {
          created_at?: string;
          dev_branch_uuid?: string | null;
          id?: number;
          name: string;
          project_uuid?: string | null;
          uuid?: string | null;
        };
        Update: {
          created_at?: string;
          dev_branch_uuid?: string | null;
          id?: number;
          name?: string;
          project_uuid?: string | null;
          uuid?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "function_model_dev_branch_uuid_fkey";
            columns: ["dev_branch_uuid"];
            isOneToOne: false;
            referencedRelation: "dev_branch";
            referencedColumns: ["uuid"];
          },
          {
            foreignKeyName: "function_model_project_uuid_fkey";
            columns: ["project_uuid"];
            isOneToOne: false;
            referencedRelation: "daily_project_run_log_metric";
            referencedColumns: ["project_uuid"];
          },
          {
            foreignKeyName: "function_model_project_uuid_fkey";
            columns: ["project_uuid"];
            isOneToOne: false;
            referencedRelation: "project";
            referencedColumns: ["uuid"];
          }
        ];
      };
      function_model_version: {
        Row: {
          created_at: string;
          dev_branch_uuid: string | null;
          dev_from_uuid: string | null;
          from_uuid: string | null;
          functions: string[];
          id: number;
          is_ab_test: boolean | null;
          is_deployed: boolean | null;
          is_published: boolean | null;
          model: string | null;
          output_keys: string[] | null;
          parsing_type: string | null;
          function_model_uuid: string | null;
          ratio: number | null;
          status: string | null;
          uuid: string | null;
          version: number | null;
        };
        Insert: {
          created_at?: string;
          dev_branch_uuid?: string | null;
          dev_from_uuid?: string | null;
          from_uuid?: string | null;
          functions?: string[];
          id?: number;
          is_ab_test?: boolean | null;
          is_deployed?: boolean | null;
          is_published?: boolean | null;
          model?: string | null;
          output_keys?: string[] | null;
          parsing_type?: string | null;
          function_model_uuid?: string | null;
          ratio?: number | null;
          status?: string | null;
          uuid?: string | null;
          version?: number | null;
        };
        Update: {
          created_at?: string;
          dev_branch_uuid?: string | null;
          dev_from_uuid?: string | null;
          from_uuid?: string | null;
          functions?: string[];
          id?: number;
          is_ab_test?: boolean | null;
          is_deployed?: boolean | null;
          is_published?: boolean | null;
          model?: string | null;
          output_keys?: string[] | null;
          parsing_type?: string | null;
          function_model_uuid?: string | null;
          ratio?: number | null;
          status?: string | null;
          uuid?: string | null;
          version?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "function_model_version_dev_branch_uuid_fkey";
            columns: ["dev_branch_uuid"];
            isOneToOne: false;
            referencedRelation: "dev_branch";
            referencedColumns: ["uuid"];
          },
          {
            foreignKeyName: "function_model_version_parsing_type_fkey";
            columns: ["parsing_type"];
            isOneToOne: false;
            referencedRelation: "parsing_type";
            referencedColumns: ["type"];
          },
          {
            foreignKeyName: "function_model_version_function_model_uuid_fkey";
            columns: ["function_model_uuid"];
            isOneToOne: false;
            referencedRelation: "daily_run_log_metric";
            referencedColumns: ["uuid"];
          },
          {
            foreignKeyName: "function_model_version_function_model_uuid_fkey";
            columns: ["function_model_uuid"];
            isOneToOne: false;
            referencedRelation: "deployment_run_log_view";
            referencedColumns: ["function_model_uuid"];
          },
          {
            foreignKeyName: "function_model_version_function_model_uuid_fkey";
            columns: ["function_model_uuid"];
            isOneToOne: false;
            referencedRelation: "function_model";
            referencedColumns: ["uuid"];
          }
        ];
      };
      run_log: {
        Row: {
          cost: number | null;
          created_at: string;
          dev_branch_uuid: string | null;
          function_call: Json | null;
          id: number;
          input_register_name: string | null;
          inputs: Json | null;
          latency: number | null;
          metadata: Json | null;
          parsed_outputs: Json | null;
          raw_output: string | null;
          run_from_deployment: boolean | null;
          score: number | null;
          token_usage: Json | null;
          version_uuid: string | null;
        };
        Insert: {
          cost?: number | null;
          created_at?: string;
          dev_branch_uuid?: string | null;
          function_call?: Json | null;
          id?: number;
          input_register_name?: string | null;
          inputs?: Json | null;
          latency?: number | null;
          metadata?: Json | null;
          parsed_outputs?: Json | null;
          raw_output?: string | null;
          run_from_deployment?: boolean | null;
          score?: number | null;
          token_usage?: Json | null;
          version_uuid?: string | null;
        };
        Update: {
          cost?: number | null;
          created_at?: string;
          dev_branch_uuid?: string | null;
          function_call?: Json | null;
          id?: number;
          input_register_name?: string | null;
          inputs?: Json | null;
          latency?: number | null;
          metadata?: Json | null;
          parsed_outputs?: Json | null;
          raw_output?: string | null;
          run_from_deployment?: boolean | null;
          score?: number | null;
          token_usage?: Json | null;
          version_uuid?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "run_log_dev_branch_uuid_fkey";
            columns: ["dev_branch_uuid"];
            isOneToOne: false;
            referencedRelation: "dev_branch";
            referencedColumns: ["uuid"];
          },
          {
            foreignKeyName: "run_log_version_uuid_fkey";
            columns: ["version_uuid"];
            isOneToOne: false;
            referencedRelation: "deployed_function_model_version";
            referencedColumns: ["uuid"];
          },
          {
            foreignKeyName: "run_log_version_uuid_fkey";
            columns: ["version_uuid"];
            isOneToOne: false;
            referencedRelation: "deployment_run_log_view";
            referencedColumns: ["function_model_version_uuid"];
          },
          {
            foreignKeyName: "run_log_version_uuid_fkey";
            columns: ["version_uuid"];
            isOneToOne: false;
            referencedRelation: "function_model_version";
            referencedColumns: ["uuid"];
          }
        ];
      };
      sample_input: {
        Row: {
          content: Json | null;
          created_at: string;
          id: number;
          name: string | null;
          project_uuid: string | null;
        };
        Insert: {
          content?: Json | null;
          created_at?: string;
          id?: number;
          name?: string | null;
          project_uuid?: string | null;
        };
        Update: {
          content?: Json | null;
          created_at?: string;
          id?: number;
          name?: string | null;
          project_uuid?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "sample_input_project_uuid_fkey";
            columns: ["project_uuid"];
            isOneToOne: false;
            referencedRelation: "daily_project_run_log_metric";
            referencedColumns: ["project_uuid"];
          },
          {
            foreignKeyName: "sample_input_project_uuid_fkey";
            columns: ["project_uuid"];
            isOneToOne: false;
            referencedRelation: "project";
            referencedColumns: ["uuid"];
          }
        ];
      };
      user: {
        Row: {
          created_at: string;
          email: string | null;
          id: number;
          is_test: boolean | null;
          user_id: string | null;
        };
        Insert: {
          created_at?: string;
          email?: string | null;
          id?: number;
          is_test?: boolean | null;
          user_id?: string | null;
        };
        Update: {
          created_at?: string;
          email?: string | null;
          id?: number;
          is_test?: boolean | null;
          user_id?: string | null;
        };
        Relationships: [];
      };
      users_organizations: {
        Row: {
          created_at: string;
          id: number;
          organization_id: string | null;
          user_id: string | null;
        };
        Insert: {
          created_at?: string;
          id?: number;
          organization_id?: string | null;
          user_id?: string | null;
        };
        Update: {
          created_at?: string;
          id?: number;
          organization_id?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "users_organizations_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organization";
            referencedColumns: ["organization_id"];
          },
          {
            foreignKeyName: "users_organizations_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "user_organizations";
            referencedColumns: ["organization_id"];
          },
          {
            foreignKeyName: "users_organizations_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "user";
            referencedColumns: ["user_id"];
          }
        ];
      };
    };
    Views: {
      daily_project_run_log_metric: {
        Row: {
          avg_latency: number | null;
          day: string | null;
          name: string | null;
          project_uuid: string | null;
          total_cost: number | null;
          total_runs: number | null;
          total_token_usage: Json | null;
        };
        Relationships: [];
      };
      daily_run_log_metric: {
        Row: {
          avg_latency: number | null;
          day: string | null;
          name: string | null;
          total_cost: number | null;
          total_runs: number | null;
          total_token_usage: Json | null;
          uuid: string | null;
        };
        Relationships: [];
      };
      deployed_function_model_version: {
        Row: {
          created_at: string | null;
          from_uuid: string | null;
          id: number | null;
          is_ab_test: boolean | null;
          is_published: boolean | null;
          model: string | null;
          output_keys: string[] | null;
          parsing_type: string | null;
          function_model_uuid: string | null;
          ratio: number | null;
          uuid: string | null;
          version: number | null;
        };
        Insert: {
          created_at?: string | null;
          from_uuid?: string | null;
          id?: number | null;
          is_ab_test?: boolean | null;
          is_published?: boolean | null;
          model?: string | null;
          output_keys?: string[] | null;
          parsing_type?: string | null;
          function_model_uuid?: string | null;
          ratio?: number | null;
          uuid?: string | null;
          version?: number | null;
        };
        Update: {
          created_at?: string | null;
          from_uuid?: string | null;
          id?: number | null;
          is_ab_test?: boolean | null;
          is_published?: boolean | null;
          model?: string | null;
          output_keys?: string[] | null;
          parsing_type?: string | null;
          function_model_uuid?: string | null;
          ratio?: number | null;
          uuid?: string | null;
          version?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "function_model_version_parsing_type_fkey";
            columns: ["parsing_type"];
            isOneToOne: false;
            referencedRelation: "parsing_type";
            referencedColumns: ["type"];
          },
          {
            foreignKeyName: "function_model_version_function_model_uuid_fkey";
            columns: ["function_model_uuid"];
            isOneToOne: false;
            referencedRelation: "function_model";
            referencedColumns: ["uuid"];
          },
          {
            foreignKeyName: "function_model_version_function_model_uuid_fkey";
            columns: ["function_model_uuid"];
            isOneToOne: false;
            referencedRelation: "daily_run_log_metric";
            referencedColumns: ["uuid"];
          },
          {
            foreignKeyName: "function_model_version_function_model_uuid_fkey";
            columns: ["function_model_uuid"];
            isOneToOne: false;
            referencedRelation: "deployment_run_log_view";
            referencedColumns: ["function_model_uuid"];
          }
        ];
      };
      deployment_run_log_view: {
        Row: {
          cost: number | null;
          created_at: string | null;
          dev_branch_uuid: string | null;
          function_call: Json | null;
          inputs: Json | null;
          latency: number | null;
          metadata: Json | null;
          parsed_outputs: Json | null;
          project_uuid: string | null;
          function_model_name: string | null;
          function_model_uuid: string | null;
          function_model_version: number | null;
          function_model_version_uuid: string | null;
          raw_output: string | null;
          run_from_deployment: boolean | null;
          score: number | null;
          token_usage: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: "function_model_project_uuid_fkey";
            columns: ["project_uuid"];
            isOneToOne: false;
            referencedRelation: "project";
            referencedColumns: ["uuid"];
          },
          {
            foreignKeyName: "function_model_project_uuid_fkey";
            columns: ["project_uuid"];
            isOneToOne: false;
            referencedRelation: "daily_project_run_log_metric";
            referencedColumns: ["project_uuid"];
          },
          {
            foreignKeyName: "run_log_dev_branch_uuid_fkey";
            columns: ["dev_branch_uuid"];
            isOneToOne: false;
            referencedRelation: "dev_branch";
            referencedColumns: ["uuid"];
          }
        ];
      };
      run_logs_count: {
        Row: {
          project_uuid: string | null;
          run_logs_count: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "function_model_project_uuid_fkey";
            columns: ["project_uuid"];
            isOneToOne: false;
            referencedRelation: "project";
            referencedColumns: ["uuid"];
          },
          {
            foreignKeyName: "function_model_project_uuid_fkey";
            columns: ["project_uuid"];
            isOneToOne: false;
            referencedRelation: "daily_project_run_log_metric";
            referencedColumns: ["project_uuid"];
          }
        ];
      };
      user_organizations: {
        Row: {
          name: string | null;
          organization_id: string | null;
          slug: string | null;
          user_id: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "users_organizations_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "user";
            referencedColumns: ["user_id"];
          }
        ];
      };
    };
    Functions: {
      get_project_config: {
        Args: {
          project_id: number;
        };
        Returns: {
          name: string;
          version: number;
          is_deployment: boolean;
          is_ab_test: boolean;
          ratio: number;
          type: string;
          step: number;
          content: string;
        }[];
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
