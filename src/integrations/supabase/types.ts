export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      banco_imagens: {
        Row: {
          ativo: boolean | null
          categoria: string | null
          cliente_id: string | null
          created_at: string | null
          descricao: string | null
          id: string
          link: string | null
          orientacao: string | null
        }
        Insert: {
          ativo?: boolean | null
          categoria?: string | null
          cliente_id?: string | null
          created_at?: string | null
          descricao?: string | null
          id?: string
          link?: string | null
          orientacao?: string | null
        }
        Update: {
          ativo?: boolean | null
          categoria?: string | null
          cliente_id?: string | null
          created_at?: string | null
          descricao?: string | null
          id?: string
          link?: string | null
          orientacao?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "banco_imagens_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      calendario_conteudo: {
        Row: {
          cliente_id: string
          copy_id: string | null
          created_at: string | null
          cta: string | null
          data_post: string | null
          formato: string | null
          id: string
          ideia: string | null
          mes_referencia: string | null
          objetivo: string | null
          pilar: string | null
          status: string
          tema: string | null
        }
        Insert: {
          cliente_id: string
          copy_id?: string | null
          created_at?: string | null
          cta?: string | null
          data_post?: string | null
          formato?: string | null
          id?: string
          ideia?: string | null
          mes_referencia?: string | null
          objetivo?: string | null
          pilar?: string | null
          status?: string
          tema?: string | null
        }
        Update: {
          cliente_id?: string
          copy_id?: string | null
          created_at?: string | null
          cta?: string | null
          data_post?: string | null
          formato?: string | null
          id?: string
          ideia?: string | null
          mes_referencia?: string | null
          objetivo?: string | null
          pilar?: string | null
          status?: string
          tema?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "calendario_conteudo_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes: {
        Row: {
          cidade: string | null
          created_at: string | null
          data_cancelamento: string | null
          data_inicio: string | null
          dia_vencimento: number | null
          email: string | null
          id: string
          instagram: string | null
          link_planilha: string | null
          nome_contato: string | null
          nome_empresa: string
          observacoes: string | null
          plano: string | null
          responsavel: string | null
          status: string
          valor_mensal: number | null
          whatsapp: string | null
        }
        Insert: {
          cidade?: string | null
          created_at?: string | null
          data_cancelamento?: string | null
          data_inicio?: string | null
          dia_vencimento?: number | null
          email?: string | null
          id?: string
          instagram?: string | null
          link_planilha?: string | null
          nome_contato?: string | null
          nome_empresa: string
          observacoes?: string | null
          plano?: string | null
          responsavel?: string | null
          status?: string
          valor_mensal?: number | null
          whatsapp?: string | null
        }
        Update: {
          cidade?: string | null
          created_at?: string | null
          data_cancelamento?: string | null
          data_inicio?: string | null
          dia_vencimento?: number | null
          email?: string | null
          id?: string
          instagram?: string | null
          link_planilha?: string | null
          nome_contato?: string | null
          nome_empresa?: string
          observacoes?: string | null
          plano?: string | null
          responsavel?: string | null
          status?: string
          valor_mensal?: number | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      datas_comemorativas: {
        Row: {
          abrangencia: string
          created_at: string | null
          data: string
          data_fim: string | null
          id: string
          mes: number
          nome: string
          peso: number
          tipo: string | null
        }
        Insert: {
          abrangencia?: string
          created_at?: string | null
          data: string
          data_fim?: string | null
          id?: string
          mes: number
          nome: string
          peso?: number
          tipo?: string | null
        }
        Update: {
          abrangencia?: string
          created_at?: string | null
          data?: string
          data_fim?: string | null
          id?: string
          mes?: number
          nome?: string
          peso?: number
          tipo?: string | null
        }
        Relationships: []
      }
      estrategia_conteudo: {
        Row: {
          cadencia: string | null
          cliente_id: string
          created_at: string | null
          id: string
          mix_formatos: string | null
          pilares: Json | null
          status: string
        }
        Insert: {
          cadencia?: string | null
          cliente_id: string
          created_at?: string | null
          id?: string
          mix_formatos?: string | null
          pilares?: Json | null
          status?: string
        }
        Update: {
          cadencia?: string | null
          cliente_id?: string
          created_at?: string | null
          id?: string
          mix_formatos?: string | null
          pilares?: Json | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "estrategia_conteudo_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      execucoes: {
        Row: {
          agente: string
          cliente_id: string
          concluido_em: string | null
          erro_mensagem: string | null
          id: string
          iniciado_em: string
          n8n_execution_id: string | null
          parametros: Json
          registros_afetados: number | null
          status: string
        }
        Insert: {
          agente: string
          cliente_id: string
          concluido_em?: string | null
          erro_mensagem?: string | null
          id?: string
          iniciado_em?: string
          n8n_execution_id?: string | null
          parametros?: Json
          registros_afetados?: number | null
          status?: string
        }
        Update: {
          agente?: string
          cliente_id?: string
          concluido_em?: string | null
          erro_mensagem?: string | null
          id?: string
          iniciado_em?: string
          n8n_execution_id?: string | null
          parametros?: Json
          registros_afetados?: number | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "execucoes_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      pecas_conteudo: {
        Row: {
          calendario_id: string
          cliente_id: string | null
          created_at: string | null
          gancho: string | null
          hashtags: string | null
          id: string
          imagem_base_link: string | null
          legenda: string | null
          link_imagem: string | null
          prompt_imagem: string | null
          roteiro: string | null
          versao: number
        }
        Insert: {
          calendario_id: string
          cliente_id?: string | null
          created_at?: string | null
          gancho?: string | null
          hashtags?: string | null
          id?: string
          imagem_base_link?: string | null
          legenda?: string | null
          link_imagem?: string | null
          prompt_imagem?: string | null
          roteiro?: string | null
          versao?: number
        }
        Update: {
          calendario_id?: string
          cliente_id?: string | null
          created_at?: string | null
          gancho?: string | null
          hashtags?: string | null
          id?: string
          imagem_base_link?: string | null
          legenda?: string | null
          link_imagem?: string | null
          prompt_imagem?: string | null
          roteiro?: string | null
          versao?: number
        }
        Relationships: [
          {
            foreignKeyName: "pecas_conteudo_calendario_id_fkey"
            columns: ["calendario_id"]
            isOneToOne: false
            referencedRelation: "calendario_conteudo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pecas_conteudo_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      perfis_marca: {
        Row: {
          cliente_id: string
          created_at: string | null
          diferenciais: string | null
          fontes: string | null
          id: string
          objetivo_principal: string | null
          paleta_cores: string | null
          produtos_servicos: string | null
          publico_alvo: string | null
          restricoes: string | null
          segmento: string | null
          tom_de_voz: string | null
        }
        Insert: {
          cliente_id: string
          created_at?: string | null
          diferenciais?: string | null
          fontes?: string | null
          id?: string
          objetivo_principal?: string | null
          paleta_cores?: string | null
          produtos_servicos?: string | null
          publico_alvo?: string | null
          restricoes?: string | null
          segmento?: string | null
          tom_de_voz?: string | null
        }
        Update: {
          cliente_id?: string
          created_at?: string | null
          diferenciais?: string | null
          fontes?: string | null
          id?: string
          objetivo_principal?: string | null
          paleta_cores?: string | null
          produtos_servicos?: string | null
          publico_alvo?: string | null
          restricoes?: string | null
          segmento?: string | null
          tom_de_voz?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "perfis_marca_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      uso_tokens: {
        Row: {
          agente: string | null
          cliente_id: string | null
          created_at: string | null
          custo_usd: number | null
          id: string
          mes_referencia: string | null
          modelo: string | null
          tokens_entrada: number | null
          tokens_saida: number | null
          tokens_total: number | null
        }
        Insert: {
          agente?: string | null
          cliente_id?: string | null
          created_at?: string | null
          custo_usd?: number | null
          id?: string
          mes_referencia?: string | null
          modelo?: string | null
          tokens_entrada?: number | null
          tokens_saida?: number | null
          tokens_total?: number | null
        }
        Update: {
          agente?: string | null
          cliente_id?: string | null
          created_at?: string | null
          custo_usd?: number | null
          id?: string
          mes_referencia?: string | null
          modelo?: string | null
          tokens_entrada?: number | null
          tokens_saida?: number | null
          tokens_total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "uso_tokens_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
