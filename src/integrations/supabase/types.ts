export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      certificates: {
        Row: {
          certificate_no: string;
          created_at: string;
          graduation_date: string | null;
          id: string;
          status: string;
          title: string;
          user_id: string;
        };
        Insert: {
          certificate_no: string;
          created_at?: string;
          graduation_date?: string | null;
          id?: string;
          status?: string;
          title?: string;
          user_id: string;
        };
        Update: {
          certificate_no?: string;
          created_at?: string;
          graduation_date?: string | null;
          id?: string;
          status?: string;
          title?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      courses: {
        Row: {
          active: boolean;
          created_at: string;
          details: string;
          duration_weeks: number;
          icon: string;
          id: string;
          level: string;
          slug: string;
          sort_order: number;
          summary: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          created_at?: string;
          details?: string;
          duration_weeks?: number;
          icon?: string;
          id?: string;
          level?: string;
          slug: string;
          sort_order?: number;
          summary?: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          details?: string;
          duration_weeks?: number;
          icon?: string;
          id?: string;
          level?: string;
          slug?: string;
          sort_order?: number;
          summary?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      enrollment_courses: {
        Row: {
          course_id: string;
          created_at: string;
          enrollment_id: string;
          id: string;
          progress: number;
          status: string;
        };
        Insert: {
          course_id: string;
          created_at?: string;
          enrollment_id: string;
          id?: string;
          progress?: number;
          status?: string;
        };
        Update: {
          course_id?: string;
          created_at?: string;
          enrollment_id?: string;
          id?: string;
          progress?: number;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "enrollment_courses_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "enrollment_courses_enrollment_id_fkey";
            columns: ["enrollment_id"];
            isOneToOne: false;
            referencedRelation: "enrollments";
            referencedColumns: ["id"];
          },
        ];
      };
      enrollments: {
        Row: {
          created_at: string;
          id: string;
          notes: string;
          path: string;
          shift_id: string | null;
          start_date: string | null;
          status: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          notes?: string;
          path?: string;
          shift_id?: string | null;
          start_date?: string | null;
          status?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          notes?: string;
          path?: string;
          shift_id?: string | null;
          start_date?: string | null;
          status?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "enrollments_shift_id_fkey";
            columns: ["shift_id"];
            isOneToOne: false;
            referencedRelation: "shifts";
            referencedColumns: ["id"];
          },
        ];
      };
      exam_results: {
        Row: {
          created_at: string;
          exam_id: string;
          id: string;
          remarks: string;
          score: number | null;
          status: string;
          taken_on: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          exam_id: string;
          id?: string;
          remarks?: string;
          score?: number | null;
          status?: string;
          taken_on?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string;
          exam_id?: string;
          id?: string;
          remarks?: string;
          score?: number | null;
          status?: string;
          taken_on?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "exam_results_exam_id_fkey";
            columns: ["exam_id"];
            isOneToOne: false;
            referencedRelation: "exams";
            referencedColumns: ["id"];
          },
        ];
      };
      exams: {
        Row: {
          active: boolean;
          course_id: string | null;
          created_at: string;
          exam_date: string | null;
          id: string;
          pass_mark: number;
          title: string;
        };
        Insert: {
          active?: boolean;
          course_id?: string | null;
          created_at?: string;
          exam_date?: string | null;
          id?: string;
          pass_mark?: number;
          title: string;
        };
        Update: {
          active?: boolean;
          course_id?: string | null;
          created_at?: string;
          exam_date?: string | null;
          id?: string;
          pass_mark?: number;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: "exams_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
        ];
      };
      faqs: {
        Row: {
          answer: string;
          created_at: string;
          id: string;
          published: boolean;
          question: string;
          sort_order: number;
        };
        Insert: {
          answer: string;
          created_at?: string;
          id?: string;
          published?: boolean;
          question: string;
          sort_order?: number;
        };
        Update: {
          answer?: string;
          created_at?: string;
          id?: string;
          published?: boolean;
          question?: string;
          sort_order?: number;
        };
        Relationships: [];
      };
      gallery_posts: {
        Row: {
          caption: string;
          created_at: string;
          id: string;
          image_url: string;
          published: boolean;
          sort_order: number;
          title: string;
        };
        Insert: {
          caption?: string;
          created_at?: string;
          id?: string;
          image_url?: string;
          published?: boolean;
          sort_order?: number;
          title: string;
        };
        Update: {
          caption?: string;
          created_at?: string;
          id?: string;
          image_url?: string;
          published?: boolean;
          sort_order?: number;
          title?: string;
        };
        Relationships: [];
      };
      order_items: {
        Row: {
          attributes: Json;
          discount_amount: number;
          discount_percent: number;
          id: string;
          name: string;
          order_id: string;
          product_id: string | null;
          quantity: number;
          unit_price: number;
        };
        Insert: {
          attributes?: Json;
          discount_amount?: number;
          discount_percent?: number;
          id?: string;
          name: string;
          order_id: string;
          product_id?: string | null;
          quantity?: number;
          unit_price?: number;
        };
        Update: {
          attributes?: Json;
          discount_amount?: number;
          discount_percent?: number;
          id?: string;
          name?: string;
          order_id?: string;
          product_id?: string | null;
          quantity?: number;
          unit_price?: number;
        };
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      orders: {
        Row: {
          approved_at: string | null;
          created_at: string;
          delivery_address: string;
          delivery_status: string | null;
          delivery_visible: boolean;
          discount_total: number;
          customer_name: string;
          customer_phone: string;
          id: string;
          notes: string;
          payment_method: string | null;
          payment_proof: string | null;
          payment_reference: string | null;
          payment_status: string;
          rejection_reason: string | null;
          rejected_at: string | null;
          status: string;
          total: number;
          user_id: string;
        };
        Insert: {
          approved_at?: string | null;
          created_at?: string;
          customer_name?: string;
          customer_phone?: string;
          delivery_address?: string;
          delivery_status?: string | null;
          delivery_visible?: boolean;
          discount_total?: number;
          id?: string;
          notes?: string;
          payment_method?: string | null;
          payment_proof?: string | null;
          payment_reference?: string | null;
          payment_status?: string;
          rejection_reason?: string | null;
          rejected_at?: string | null;
          status?: string;
          total?: number;
          user_id: string;
        };
        Update: {
          approved_at?: string | null;
          created_at?: string;
          customer_name?: string;
          customer_phone?: string;
          delivery_address?: string;
          delivery_status?: string | null;
          delivery_visible?: boolean;
          discount_total?: number;
          id?: string;
          notes?: string;
          payment_method?: string | null;
          payment_proof?: string | null;
          payment_reference?: string | null;
          payment_status?: string;
          rejection_reason?: string | null;
          rejected_at?: string | null;
          status?: string;
          total?: number;
          user_id?: string;
        };
        Relationships: [];
      };
      order_payments: {
        Row: {
          amount: number;
          created_at: string;
          id: string;
          method: string;
          order_id: string;
          proof: string | null;
          reference: string | null;
          rejection_reason: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          status: string;
        };
        Insert: {
          amount?: number;
          created_at?: string;
          id?: string;
          method: string;
          order_id: string;
          proof?: string | null;
          reference?: string | null;
          rejection_reason?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          status?: string;
        };
        Update: {
          amount?: number;
          created_at?: string;
          id?: string;
          method?: string;
          order_id?: string;
          proof?: string | null;
          reference?: string | null;
          rejection_reason?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          status?: string;
        };
        Relationships: [];
      };
      products: {
        Row: {
          active: boolean;
          allow_individual_payment: boolean;
          attributes: Json;
          badge: string | null;
          category: string;
          created_at: string;
          description: string;
          details: string;
          id: string;
          image_url: string | null;
          low_stock_threshold: number;
          name: string;
          path: string | null;
          price: number;
          sort_order: number;
          stock_quantity: number | null;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          allow_individual_payment?: boolean;
          attributes?: Json;
          badge?: string | null;
          category?: string;
          created_at?: string;
          description?: string;
          details?: string;
          id?: string;
          image_url?: string | null;
          low_stock_threshold?: number;
          name: string;
          path?: string | null;
          price?: number;
          sort_order?: number;
          stock_quantity?: number | null;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          allow_individual_payment?: boolean;
          attributes?: Json;
          badge?: string | null;
          category?: string;
          created_at?: string;
          description?: string;
          details?: string;
          id?: string;
          image_url?: string | null;
          low_stock_threshold?: number;
          name?: string;
          path?: string | null;
          price?: number;
          sort_order?: number;
          stock_quantity?: number | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          created_at: string;
          full_name: string | null;
          id: string;
          phone: string | null;
          updated_at: string;
          username: string | null;
        };
        Insert: {
          created_at?: string;
          full_name?: string | null;
          id: string;
          phone?: string | null;
          updated_at?: string;
          username?: string | null;
        };
        Update: {
          created_at?: string;
          full_name?: string | null;
          id?: string;
          phone?: string | null;
          updated_at?: string;
          username?: string | null;
        };
        Relationships: [];
      };
      shifts: {
        Row: {
          active: boolean;
          created_at: string;
          days: string;
          end_time: string;
          id: string;
          name: string;
          notes: string;
          path: string;
          seats: number;
          seats_taken: number;
          sort_order: number;
          start_time: string;
        };
        Insert: {
          active?: boolean;
          created_at?: string;
          days?: string;
          end_time: string;
          id?: string;
          name: string;
          notes?: string;
          path?: string;
          seats?: number;
          seats_taken?: number;
          sort_order?: number;
          start_time: string;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          days?: string;
          end_time?: string;
          id?: string;
          name?: string;
          notes?: string;
          path?: string;
          seats?: number;
          seats_taken?: number;
          sort_order?: number;
          start_time?: string;
        };
        Relationships: [];
      };
      site_content: {
        Row: {
          key: string;
          updated_at: string;
          value: string;
        };
        Insert: {
          key: string;
          updated_at?: string;
          value?: string;
        };
        Update: {
          key?: string;
          updated_at?: string;
          value?: string;
        };
        Relationships: [];
      };
      testimonials: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          photo_url: string | null;
          program: string;
          published: boolean;
          quote: string;
          rating: number;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
          photo_url?: string | null;
          program?: string;
          published?: boolean;
          quote: string;
          rating?: number;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          photo_url?: string | null;
          program?: string;
          published?: boolean;
          quote?: string;
          rating?: number;
        };
        Relationships: [];
      };
      tutors: {
        Row: {
          active: boolean;
          bio: string;
          created_at: string;
          id: string;
          name: string;
          photo_url: string | null;
          qualifications: string;
          sort_order: number;
          title: string;
        };
        Insert: {
          active?: boolean;
          bio?: string;
          created_at?: string;
          id?: string;
          name: string;
          photo_url?: string | null;
          qualifications?: string;
          sort_order?: number;
          title?: string;
        };
        Update: {
          active?: boolean;
          bio?: string;
          created_at?: string;
          id?: string;
          name?: string;
          photo_url?: string | null;
          qualifications?: string;
          sort_order?: number;
          title?: string;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
    };
    Enums: {
      app_role: "admin" | "student";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "student"],
    },
  },
} as const;
