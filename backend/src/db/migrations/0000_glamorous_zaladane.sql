CREATE TYPE "public"."application_status" AS ENUM('APPLIED', 'INTERVIEW', 'REJECTED', 'OFFER', 'WITHDRAWN');--> statement-breakpoint
CREATE TYPE "public"."job_type" AS ENUM('INTERNSHIP', 'FULL_TIME', 'PART_TIME', 'CONTRACT');--> statement-breakpoint
CREATE TYPE "public"."salary_period" AS ENUM('MONTH', 'YEAR', 'STIPEND');--> statement-breakpoint
CREATE TYPE "public"."skill_importance" AS ENUM('REQUIRED', 'PREFERRED');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('USER', 'ADMIN', 'RECRUITER');--> statement-breakpoint
CREATE TYPE "public"."work_mode" AS ENUM('ONSITE', 'HYBRID', 'REMOTE');--> statement-breakpoint
CREATE TABLE "applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"job_id" uuid NOT NULL,
	"status" "application_status" DEFAULT 'APPLIED' NOT NULL,
	"notes" text,
	"applied_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "companies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(150) NOT NULL,
	"description" text,
	"website_url" text,
	"logo_url" text,
	"address" text,
	"city" varchar(100),
	"state" varchar(100),
	"postal_code" varchar(20),
	"latitude" numeric(10, 8),
	"longitude" numeric(11, 8),
	"is_verified" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_skills" (
	"job_id" uuid NOT NULL,
	"skill_id" uuid NOT NULL,
	"importance" "skill_importance" DEFAULT 'REQUIRED' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"title" varchar(180) NOT NULL,
	"description" text NOT NULL,
	"requirements" text,
	"experience_min" integer DEFAULT 0 NOT NULL,
	"experience_max" integer,
	"salary_min" integer,
	"salary_max" integer,
	"salary_period" "salary_period" DEFAULT 'YEAR' NOT NULL,
	"job_type" "job_type" NOT NULL,
	"work_mode" "work_mode" NOT NULL,
	"address" text,
	"city" varchar(100),
	"state" varchar(100),
	"postal_code" varchar(20),
	"latitude" numeric(10, 8),
	"longitude" numeric(11, 8),
	"application_url" text NOT NULL,
	"source_name" varchar(100) NOT NULL,
	"source_job_id" varchar(200),
	"source_label" varchar(100),
	"posted_at" timestamp,
	"expires_at" timestamp,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "saved_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"job_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "skills" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"normalized_name" varchar(100) NOT NULL,
	"category" varchar(100),
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "skills_name_unique" UNIQUE("name"),
	CONSTRAINT "skills_normalized_name_unique" UNIQUE("normalized_name")
);
--> statement-breakpoint
CREATE TABLE "user_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"preferred_role" varchar(150),
	"minimum_salary" integer,
	"maximum_distance_km" numeric(8, 2) DEFAULT '10' NOT NULL,
	"preferred_job_types" text[] DEFAULT '{}' NOT NULL,
	"preferred_work_modes" text[] DEFAULT '{}' NOT NULL,
	"preferred_locations" text[] DEFAULT '{}' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_preferences_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"email" varchar(150) NOT NULL,
	"password_hash" text NOT NULL,
	"role" "user_role" DEFAULT 'USER' NOT NULL,
	"phone" varchar(20),
	"profile_image_url" text,
	"latitude" numeric(10, 8),
	"longitude" numeric(11, 8),
	"address" text,
	"city" varchar(100),
	"state" varchar(100),
	"postal_code" varchar(20),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_skills" ADD CONSTRAINT "job_skills_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_skills" ADD CONSTRAINT "job_skills_skill_id_skills_id_fk" FOREIGN KEY ("skill_id") REFERENCES "public"."skills"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_jobs" ADD CONSTRAINT "saved_jobs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_jobs" ADD CONSTRAINT "saved_jobs_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_applications_user_id" ON "applications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_applications_job_id" ON "applications" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "idx_applications_status" ON "applications" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_companies_name" ON "companies" USING btree ("name");--> statement-breakpoint
CREATE INDEX "idx_companies_city" ON "companies" USING btree ("city");--> statement-breakpoint
CREATE INDEX "idx_job_skills_job_id" ON "job_skills" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "idx_job_skills_skill_id" ON "job_skills" USING btree ("skill_id");--> statement-breakpoint
CREATE INDEX "idx_jobs_title" ON "jobs" USING btree ("title");--> statement-breakpoint
CREATE INDEX "idx_jobs_city" ON "jobs" USING btree ("city");--> statement-breakpoint
CREATE INDEX "idx_jobs_job_type" ON "jobs" USING btree ("job_type");--> statement-breakpoint
CREATE INDEX "idx_jobs_work_mode" ON "jobs" USING btree ("work_mode");--> statement-breakpoint
CREATE INDEX "idx_jobs_is_active" ON "jobs" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_jobs_posted_at" ON "jobs" USING btree ("posted_at");--> statement-breakpoint
CREATE INDEX "idx_jobs_lat_lng" ON "jobs" USING btree ("latitude","longitude");--> statement-breakpoint
CREATE INDEX "idx_saved_jobs_user_id" ON "saved_jobs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_saved_jobs_job_id" ON "saved_jobs" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "idx_skills_normalized_name" ON "skills" USING btree ("normalized_name");--> statement-breakpoint
CREATE INDEX "idx_user_prefs_user_id" ON "user_preferences" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_users_email" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_users_role" ON "users" USING btree ("role");--> statement-breakpoint
CREATE INDEX "idx_users_city" ON "users" USING btree ("city");