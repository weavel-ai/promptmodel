export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      cli_access: {
        Row: {
          api_key: string | null
          created_at: string
          expires_at: string | null
          user_id: string
        }
        Insert: {
          api_key?: string | null
          created_at?: string
          expires_at?: string | null
          user_id: string
        }
        Update: {
          api_key?: string | null
          created_at?: string
          expires_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cli_access_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "user"
            referencedColumns: ["user_id"]
          }
        ]
      }
      dev_branch: {
        Row: {
          cli_access_key: string | null
          created_at: string
          id: number
          name: string | null
          online: boolean
          project_uuid: string | null
          sync: boolean
        }
        Insert: {
          cli_access_key?: string | null
          created_at?: string
          id?: number
          name?: string | null
          online?: boolean
          project_uuid?: string | null
          sync?: boolean
        }
        Update: {
          cli_access_key?: string | null
          created_at?: string
          id?: number
          name?: string | null
          online?: boolean
          project_uuid?: string | null
          sync?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "dev_branch_cli_access_key_fkey"
            columns: ["cli_access_key"]
            referencedRelation: "cli_access"
            referencedColumns: ["api_key"]
          },
          {
            foreignKeyName: "dev_branch_project_uuid_fkey"
            columns: ["project_uuid"]
            referencedRelation: "project"
            referencedColumns: ["uuid"]
          }
        ]
      }
      llm_module: {
        Row: {
          created_at: string
          id: number
          name: string
          project_uuid: string | null
          uuid: string | null
        }
        Insert: {
          created_at?: string
          id?: number
          name: string
          project_uuid?: string | null
          uuid?: string | null
        }
        Update: {
          created_at?: string
          id?: number
          name?: string
          project_uuid?: string | null
          uuid?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "llm_module_project_uuid_fkey"
            columns: ["project_uuid"]
            referencedRelation: "project"
            referencedColumns: ["uuid"]
          }
        ]
      }
      llm_module_version: {
        Row: {
          created_at: string
          from_uuid: string | null
          functions: string[]
          id: number
          is_ab_test: boolean | null
          is_published: boolean | null
          llm_module_uuid: string | null
          model: string | null
          output_keys: string[] | null
          parsing_type: string | null
          ratio: number | null
          uuid: string | null
          version: number
        }
        Insert: {
          created_at?: string
          from_uuid?: string | null
          functions?: string[]
          id?: number
          is_ab_test?: boolean | null
          is_published?: boolean | null
          llm_module_uuid?: string | null
          model?: string | null
          output_keys?: string[] | null
          parsing_type?: string | null
          ratio?: number | null
          uuid?: string | null
          version?: number
        }
        Update: {
          created_at?: string
          from_uuid?: string | null
          functions?: string[]
          id?: number
          is_ab_test?: boolean | null
          is_published?: boolean | null
          llm_module_uuid?: string | null
          model?: string | null
          output_keys?: string[] | null
          parsing_type?: string | null
          ratio?: number | null
          uuid?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "llm_module_version_from_uuid_fkey"
            columns: ["from_uuid"]
            referencedRelation: "llm_module_version"
            referencedColumns: ["uuid"]
          },
          {
            foreignKeyName: "llm_module_version_from_uuid_fkey"
            columns: ["from_uuid"]
            referencedRelation: "deployed_llm_module_version"
            referencedColumns: ["uuid"]
          },
          {
            foreignKeyName: "llm_module_version_llm_module_uuid_fkey"
            columns: ["llm_module_uuid"]
            referencedRelation: "llm_module"
            referencedColumns: ["uuid"]
          },
          {
            foreignKeyName: "llm_module_version_llm_module_uuid_fkey"
            columns: ["llm_module_uuid"]
            referencedRelation: "daily_run_log_metric"
            referencedColumns: ["uuid"]
          },
          {
            foreignKeyName: "llm_module_version_parsing_type_fkey"
            columns: ["parsing_type"]
            referencedRelation: "parsing_type"
            referencedColumns: ["type"]
          }
        ]
      }
      organization: {
        Row: {
          created_at: string
          id: number
          name: string | null
          organization_id: string | null
          slug: string | null
        }
        Insert: {
          created_at?: string
          id?: number
          name?: string | null
          organization_id?: string | null
          slug?: string | null
        }
        Update: {
          created_at?: string
          id?: number
          name?: string | null
          organization_id?: string | null
          slug?: string | null
        }
        Relationships: []
      }
      parsing_type: {
        Row: {
          id: number
          type: string
        }
        Insert: {
          id?: number
          type: string
        }
        Update: {
          id?: number
          type?: string
        }
        Relationships: []
      }
      project: {
        Row: {
          api_key: string | null
          created_at: string
          description: string | null
          id: number
          name: string | null
          organization_id: string | null
          uuid: string | null
          version: string | null
        }
        Insert: {
          api_key?: string | null
          created_at?: string
          description?: string | null
          id?: number
          name?: string | null
          organization_id?: string | null
          uuid?: string | null
          version?: string | null
        }
        Update: {
          api_key?: string | null
          created_at?: string
          description?: string | null
          id?: number
          name?: string | null
          organization_id?: string | null
          uuid?: string | null
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_organization_id_fkey"
            columns: ["organization_id"]
            referencedRelation: "organization"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "project_organization_id_fkey"
            columns: ["organization_id"]
            referencedRelation: "user_organizations"
            referencedColumns: ["organization_id"]
          }
        ]
      }
      project_changelog: {
        Row: {
          created_at: string
          id: number
          level: number
          logs: Json[]
          previous_version: string
          project_uuid: string | null
        }
        Insert: {
          created_at?: string
          id?: number
          level?: number
          logs?: Json[]
          previous_version: string
          project_uuid?: string | null
        }
        Update: {
          created_at?: string
          id?: number
          level?: number
          logs?: Json[]
          previous_version?: string
          project_uuid?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_changelog_project_uuid_fkey"
            columns: ["project_uuid"]
            referencedRelation: "project"
            referencedColumns: ["uuid"]
          }
        ]
      }
      prompt: {
        Row: {
          content: string | null
          created_at: string
          id: number
          role: string
          step: number
          version_uuid: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: number
          role: string
          step?: number
          version_uuid?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: number
          role?: string
          step?: number
          version_uuid?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prompt_version_uuid_fkey"
            columns: ["version_uuid"]
            referencedRelation: "llm_module_version"
            referencedColumns: ["uuid"]
          },
          {
            foreignKeyName: "prompt_version_uuid_fkey"
            columns: ["version_uuid"]
            referencedRelation: "deployed_llm_module_version"
            referencedColumns: ["uuid"]
          }
        ]
      }
      run_log: {
        Row: {
          cost: number | null
          created_at: string
          function_call: Json | null
          id: number
          input_register_name: string | null
          inputs: Json
          is_deployment: boolean | null
          latency: number | null
          metadata: Json | null
          parsed_outputs: Json | null
          raw_output: string | null
          token_usage: Json | null
          version_uuid: string | null
        }
        Insert: {
          cost?: number | null
          created_at?: string
          function_call?: Json | null
          id?: number
          input_register_name?: string | null
          inputs?: Json
          is_deployment?: boolean | null
          latency?: number | null
          metadata?: Json | null
          parsed_outputs?: Json | null
          raw_output?: string | null
          token_usage?: Json | null
          version_uuid?: string | null
        }
        Update: {
          cost?: number | null
          created_at?: string
          function_call?: Json | null
          id?: number
          input_register_name?: string | null
          inputs?: Json
          is_deployment?: boolean | null
          latency?: number | null
          metadata?: Json | null
          parsed_outputs?: Json | null
          raw_output?: string | null
          token_usage?: Json | null
          version_uuid?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "run_log_version_uuid_fkey"
            columns: ["version_uuid"]
            referencedRelation: "llm_module_version"
            referencedColumns: ["uuid"]
          },
          {
            foreignKeyName: "run_log_version_uuid_fkey"
            columns: ["version_uuid"]
            referencedRelation: "deployed_llm_module_version"
            referencedColumns: ["uuid"]
          }
        ]
      }
      sample_inputs: {
        Row: {
          content: Json
          created_at: string
          dev_id: number
          id: number
          name: string
        }
        Insert: {
          content?: Json
          created_at?: string
          dev_id: number
          id?: number
          name: string
        }
        Update: {
          content?: Json
          created_at?: string
          dev_id?: number
          id?: number
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "sample_inputs_dev_id_fkey"
            columns: ["dev_id"]
            referencedRelation: "dev_branch"
            referencedColumns: ["id"]
          }
        ]
      }
      user: {
        Row: {
          created_at: string
          email: string | null
          id: number
          is_test: boolean | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: number
          is_test?: boolean | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: number
          is_test?: boolean | null
          user_id?: string | null
        }
        Relationships: []
      }
      users_organizations: {
        Row: {
          created_at: string
          id: number
          organization_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: number
          organization_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: number
          organization_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_organizations_organization_id_fkey"
            columns: ["organization_id"]
            referencedRelation: "organization"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "users_organizations_organization_id_fkey"
            columns: ["organization_id"]
            referencedRelation: "user_organizations"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "users_organizations_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "user"
            referencedColumns: ["user_id"]
          }
        ]
      }
    }
    Views: {
      daily_run_log_metric: {
        Row: {
          avg_latency: number | null
          day: string | null
          name: string | null
          total_cost: number | null
          total_runs: number | null
          total_token_usage: Json | null
          uuid: string | null
        }
        Relationships: []
      }
      deployed_llm_module_version: {
        Row: {
          created_at: string | null
          from_uuid: string | null
          id: number | null
          is_ab_test: boolean | null
          is_published: boolean | null
          llm_module_uuid: string | null
          model: string | null
          output_keys: string[] | null
          parsing_type: string | null
          ratio: number | null
          uuid: string | null
          version: number | null
        }
        Insert: {
          created_at?: string | null
          from_uuid?: string | null
          id?: number | null
          is_ab_test?: boolean | null
          is_published?: boolean | null
          llm_module_uuid?: string | null
          model?: string | null
          output_keys?: string[] | null
          parsing_type?: string | null
          ratio?: number | null
          uuid?: string | null
          version?: number | null
        }
        Update: {
          created_at?: string | null
          from_uuid?: string | null
          id?: number | null
          is_ab_test?: boolean | null
          is_published?: boolean | null
          llm_module_uuid?: string | null
          model?: string | null
          output_keys?: string[] | null
          parsing_type?: string | null
          ratio?: number | null
          uuid?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "llm_module_version_from_uuid_fkey"
            columns: ["from_uuid"]
            referencedRelation: "llm_module_version"
            referencedColumns: ["uuid"]
          },
          {
            foreignKeyName: "llm_module_version_from_uuid_fkey"
            columns: ["from_uuid"]
            referencedRelation: "deployed_llm_module_version"
            referencedColumns: ["uuid"]
          },
          {
            foreignKeyName: "llm_module_version_llm_module_uuid_fkey"
            columns: ["llm_module_uuid"]
            referencedRelation: "llm_module"
            referencedColumns: ["uuid"]
          },
          {
            foreignKeyName: "llm_module_version_llm_module_uuid_fkey"
            columns: ["llm_module_uuid"]
            referencedRelation: "daily_run_log_metric"
            referencedColumns: ["uuid"]
          },
          {
            foreignKeyName: "llm_module_version_parsing_type_fkey"
            columns: ["parsing_type"]
            referencedRelation: "parsing_type"
            referencedColumns: ["type"]
          }
        ]
      }
      user_organizations: {
        Row: {
          name: string | null
          organization_id: string | null
          slug: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_organizations_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "user"
            referencedColumns: ["user_id"]
          }
        ]
      }
    }
    Functions: {
      get_project_config: {
        Args: {
          project_id: number
        }
        Returns: {
          name: string
          version: number
          is_deployment: boolean
          is_ab_test: boolean
          ratio: number
          type: string
          step: number
          content: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
