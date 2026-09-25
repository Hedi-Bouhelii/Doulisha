CREATE TABLE "organizer_photos" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organizer_profile_id" uuid NOT NULL,
	"url" text NOT NULL,
	"caption" text,
	"sort" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "organizer_profiles" ADD COLUMN "contact_phone" text;--> statement-breakpoint
ALTER TABLE "organizer_profiles" ADD COLUMN "contact_email" text;--> statement-breakpoint
ALTER TABLE "organizer_profiles" ADD COLUMN "payment_instructions" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "organizer_photos" ADD CONSTRAINT "organizer_photos_organizer_profile_id_organizer_profiles_id_fk" FOREIGN KEY ("organizer_profile_id") REFERENCES "public"."organizer_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "organizer_photos_organizer_profile_id_sort_index" ON "organizer_photos" USING btree ("organizer_profile_id","sort");