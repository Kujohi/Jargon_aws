-- New Database Schema for Accumulative Jar System
-- This schema supports adding monthly income to jars instead of resetting them
-- All views converted to tables for better performance

-- Keep existing users and jar_categories tables
CREATE TABLE public.users (
  id integer NOT NULL DEFAULT nextval('users_id_seq'::regclass),
  email character varying NOT NULL UNIQUE,
  full_name character varying,
  saving_target_cents bigint DEFAULT 0,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT users_pkey PRIMARY KEY (id)
);

CREATE TABLE public.jar_categories (
  id integer NOT NULL DEFAULT nextval('jar_categories_id_seq'::regclass),
  name character varying NOT NULL UNIQUE,
  description text,
  CONSTRAINT jar_categories_pkey PRIMARY KEY (id)
);

-- NEW: Monthly Income Entries - Track each month's income and allocations
CREATE TABLE public.monthly_income_entries (
  id integer NOT NULL DEFAULT nextval('monthly_income_entries_id_seq'::regclass),
  user_id integer NOT NULL,
  month_year date NOT NULL, -- e.g., '2024-01-01' for January 2024
  total_income_cents bigint NOT NULL,
  allocation_percentages jsonb NOT NULL, -- {"Necessity": 55, "Play": 10, ...}
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT monthly_income_entries_pkey PRIMARY KEY (id),
  CONSTRAINT monthly_income_entries_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT monthly_income_entries_user_month_unique UNIQUE (user_id, month_year)
);

-- NEW: User Jars - Simple jar definitions without monthly capacity concept
CREATE TABLE public.user_jars (
  id integer NOT NULL DEFAULT nextval('user_jars_id_seq'::regclass),
  user_id integer NOT NULL,
  category_id integer NOT NULL,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT user_jars_pkey PRIMARY KEY (id),
  CONSTRAINT user_jars_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT user_jars_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.jar_categories(id),
  CONSTRAINT user_jars_user_category_unique UNIQUE (user_id, category_id)
);

-- Keep existing transactions table (works well for accumulative system)
CREATE TABLE public.transactions (
  id integer NOT NULL DEFAULT nextval('transactions_id_seq'::regclass),
  jar_category_id integer NOT NULL,
  amount_cents bigint,
  occurred_at timestamp without time zone NOT NULL DEFAULT now(),
  description text,
  source character varying,
  user_id integer,
  monthly_income_entry_id integer, -- NEW: Link to specific month's income entry (for income transactions)
  CONSTRAINT transactions_pkey PRIMARY KEY (id),
  CONSTRAINT transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT transactions_jar_category_id_fkey FOREIGN KEY (jar_category_id) REFERENCES public.jar_categories(id),
  CONSTRAINT transactions_monthly_income_entry_id_fkey FOREIGN KEY (monthly_income_entry_id) REFERENCES public.monthly_income_entries(id)
);

-- TABLE: Current Jar Balances - Real-time balances from transactions (converted from view)
CREATE TABLE public.current_jar_balances (
  id integer NOT NULL DEFAULT nextval('current_jar_balances_id_seq'::regclass),
  user_id integer NOT NULL,
  category_id integer NOT NULL,
  category_name character varying NOT NULL,
  category_description text,
  total_income_cents bigint NOT NULL DEFAULT 0,
  total_spent_cents bigint NOT NULL DEFAULT 0,
  current_balance_cents bigint NOT NULL DEFAULT 0,
  last_updated timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT current_jar_balances_pkey PRIMARY KEY (id),
  CONSTRAINT current_jar_balances_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT current_jar_balances_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.jar_categories(id),
  CONSTRAINT current_jar_balances_user_category_unique UNIQUE (user_id, category_id)
);

-- TABLE: Monthly Income Summary - Latest allocations and totals per month (converted from view)
CREATE TABLE public.monthly_income_summary (
  id integer NOT NULL DEFAULT nextval('monthly_income_summary_id_seq'::regclass),
  user_id integer NOT NULL,
  month_year date NOT NULL,
  total_income_cents bigint NOT NULL,
  allocation_percentages jsonb NOT NULL,
  category_id integer NOT NULL,
  category_name character varying NOT NULL,
  allocated_amount_cents bigint NOT NULL,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT monthly_income_summary_pkey PRIMARY KEY (id),
  CONSTRAINT monthly_income_summary_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT monthly_income_summary_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.jar_categories(id),
  CONSTRAINT monthly_income_summary_user_month_category_unique UNIQUE (user_id, month_year, category_id)
);

-- TABLE: Jar Dashboard Data - Complete dashboard information (converted from view)
CREATE TABLE public.jar_dashboard_data (
  id integer NOT NULL DEFAULT nextval('jar_dashboard_data_id_seq'::regclass),
  user_id integer NOT NULL,
  category_id integer NOT NULL,
  category_name character varying NOT NULL,
  category_description text,
  total_income_cents bigint NOT NULL DEFAULT 0,
  total_spent_cents bigint NOT NULL DEFAULT 0,
  current_balance_cents bigint NOT NULL DEFAULT 0,
  latest_allocation_percentage numeric DEFAULT 0,
  allocated_amount_this_month bigint DEFAULT 0,
  income_this_month bigint DEFAULT 0,
  spent_this_month bigint DEFAULT 0,
  last_updated timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT jar_dashboard_data_pkey PRIMARY KEY (id),
  CONSTRAINT jar_dashboard_data_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT jar_dashboard_data_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.jar_categories(id),
  CONSTRAINT jar_dashboard_data_user_category_unique UNIQUE (user_id, category_id)
);

-- FUNCTION: Refresh current jar balances
CREATE OR REPLACE FUNCTION refresh_current_jar_balances()
RETURNS void AS $$
BEGIN
  DELETE FROM public.current_jar_balances;
  
  INSERT INTO public.current_jar_balances (
    user_id, category_id, category_name, category_description,
    total_income_cents, total_spent_cents, current_balance_cents, last_updated
  )
  SELECT 
    uj.user_id,
    uj.category_id,
    jc.name as category_name,
    jc.description as category_description,
    COALESCE(SUM(CASE WHEN t.amount_cents > 0 THEN t.amount_cents ELSE 0 END), 0) as total_income_cents,
    COALESCE(SUM(CASE WHEN t.amount_cents < 0 THEN ABS(t.amount_cents) ELSE 0 END), 0) as total_spent_cents,
    COALESCE(SUM(t.amount_cents), 0) as current_balance_cents,
    now() as last_updated
  FROM public.user_jars uj
  JOIN public.jar_categories jc ON uj.category_id = jc.id
  LEFT JOIN public.transactions t ON uj.user_id = t.user_id AND uj.category_id = t.jar_category_id
  GROUP BY uj.user_id, uj.category_id, jc.name, jc.description;
END;
$$ LANGUAGE plpgsql;

-- FUNCTION: Refresh monthly income summary
CREATE OR REPLACE FUNCTION refresh_monthly_income_summary()
RETURNS void AS $$
BEGIN
  DELETE FROM public.monthly_income_summary;
  
  INSERT INTO public.monthly_income_summary (
    user_id, month_year, total_income_cents, allocation_percentages,
    category_id, category_name, allocated_amount_cents
  )
  SELECT 
    mie.user_id,
    mie.month_year,
    mie.total_income_cents,
    mie.allocation_percentages,
    jc.id as category_id,
    jc.name as category_name,
    ROUND((mie.total_income_cents * (mie.allocation_percentages->jc.name)::numeric )) as allocated_amount_cents
  FROM public.monthly_income_entries mie
  CROSS JOIN public.jar_categories jc
  WHERE (mie.allocation_percentages->jc.name) IS NOT NULL;
END;
$$ LANGUAGE plpgsql;

-- FUNCTION: Refresh jar dashboard data
CREATE OR REPLACE FUNCTION refresh_jar_dashboard_data()
RETURNS void AS $$
BEGIN
  -- First refresh the dependency tables
  PERFORM refresh_current_jar_balances();
  PERFORM refresh_monthly_income_summary();
  
  DELETE FROM public.jar_dashboard_data;
  
  INSERT INTO public.jar_dashboard_data (
    user_id, category_id, category_name, category_description,
    total_income_cents, total_spent_cents, current_balance_cents,
    latest_allocation_percentage, allocated_amount_this_month,
    income_this_month, spent_this_month, last_updated
  )
  SELECT 
    cjb.user_id,
    cjb.category_id,
    cjb.category_name,
    cjb.category_description,
    cjb.total_income_cents,
    cjb.total_spent_cents,
    cjb.current_balance_cents,
    COALESCE(latest_alloc.allocation_percentage, 0) as latest_allocation_percentage,
    COALESCE(latest_alloc.allocated_amount_this_month, 0) as allocated_amount_this_month,
    COALESCE(current_month.income_this_month, 0) as income_this_month,
    COALESCE(current_month.spent_this_month, 0) as spent_this_month,
    now() as last_updated
  FROM public.current_jar_balances cjb
  LEFT JOIN (
    -- Get latest allocation percentage for each user-category
    SELECT DISTINCT ON (user_id, category_id)
      user_id,
      category_id,
      (allocation_percentages->category_name)::numeric as allocation_percentage,
      allocated_amount_cents as allocated_amount_this_month
    FROM public.monthly_income_summary
    ORDER BY user_id, category_id, month_year DESC
  ) latest_alloc ON cjb.user_id = latest_alloc.user_id AND cjb.category_id = latest_alloc.category_id
  LEFT JOIN (
    -- Get current month's income and spending for each jar
    SELECT 
      user_id,
      jar_category_id as category_id,
      SUM(CASE WHEN amount_cents > 0 THEN amount_cents ELSE 0 END) as income_this_month,
      SUM(CASE WHEN amount_cents < 0 THEN ABS(amount_cents) ELSE 0 END) as spent_this_month
    FROM public.transactions
    WHERE DATE_TRUNC('month', occurred_at) = DATE_TRUNC('month', CURRENT_DATE)
    GROUP BY user_id, jar_category_id
  ) current_month ON cjb.user_id = current_month.user_id AND cjb.category_id = current_month.category_id;
END;
$$ LANGUAGE plpgsql;

-- TRIGGER FUNCTION: Update tables when transactions change
CREATE OR REPLACE FUNCTION trigger_refresh_jar_data()
RETURNS trigger AS $$
BEGIN
  PERFORM refresh_jar_dashboard_data();
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- TRIGGER FUNCTION: Update tables when monthly income entries change
CREATE OR REPLACE FUNCTION trigger_refresh_income_data()
RETURNS trigger AS $$
BEGIN
  PERFORM refresh_monthly_income_summary();
  PERFORM refresh_jar_dashboard_data();
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- TRIGGER FUNCTION: Update tables when user jars change
CREATE OR REPLACE FUNCTION trigger_refresh_user_jar_data()
RETURNS trigger AS $$
BEGIN
  PERFORM refresh_jar_dashboard_data();
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers to automatically update tables
CREATE TRIGGER transactions_refresh_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.transactions
  FOR EACH STATEMENT
  EXECUTE FUNCTION trigger_refresh_jar_data();

CREATE TRIGGER monthly_income_entries_refresh_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.monthly_income_entries
  FOR EACH STATEMENT
  EXECUTE FUNCTION trigger_refresh_income_data();

CREATE TRIGGER user_jars_refresh_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.user_jars
  FOR EACH STATEMENT
  EXECUTE FUNCTION trigger_refresh_user_jar_data();

-- Indexes for performance
CREATE INDEX idx_monthly_income_entries_user_month ON public.monthly_income_entries(user_id, month_year);
CREATE INDEX idx_transactions_user_jar_date ON public.transactions(user_id, jar_category_id, occurred_at);
CREATE INDEX idx_user_jars_user_category ON public.user_jars(user_id, category_id);
CREATE INDEX idx_current_jar_balances_user_category ON public.current_jar_balances(user_id, category_id);
CREATE INDEX idx_monthly_income_summary_user_month_category ON public.monthly_income_summary(user_id, month_year, category_id);
CREATE INDEX idx_jar_dashboard_data_user_category ON public.jar_dashboard_data(user_id, category_id);

-- Initial data population (run these after creating the schema)
-- SELECT refresh_jar_dashboard_data(); 