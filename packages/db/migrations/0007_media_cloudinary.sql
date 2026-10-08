CREATE TYPE "public"."media_provider" AS ENUM('local', 'cloudinary');--> statement-breakpoint
CREATE TYPE "public"."media_purpose" AS ENUM('cover', 'gallery', 'avatar', 'logo', 'proof');--> statement-breakpoint
ALTER TABLE "organizer_photos" ALTER COLUMN "url" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "payment_proofs" ADD COLUMN "media_id" uuid;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "cover_media_id" uuid;--> statement-breakpoint
ALTER TABLE "organizer_photos" ADD COLUMN "media_id" uuid;--> statement-breakpoint
ALTER TABLE "organizer_profiles" ADD COLUMN "logo_media_id" uuid;--> statement-breakpoint
ALTER TABLE "organizer_profiles" ADD COLUMN "cover_media_id" uuid;--> statement-breakpoint
ALTER TABLE "media" ADD COLUMN "provider" "media_provider" DEFAULT 'local' NOT NULL;--> statement-breakpoint
ALTER TABLE "media" ADD COLUMN "purpose" "media_purpose";--> statement-breakpoint
ALTER TABLE "media" ADD COLUMN "version" integer;--> statement-breakpoint
ALTER TABLE "media" ADD COLUMN "format" text;--> statement-breakpoint
ALTER TABLE "media" ADD COLUMN "bytes" integer;--> statement-breakpoint
ALTER TABLE "media" ADD COLUMN "checksum_sha256" text;--> statement-breakpoint
ALTER TABLE "media" ADD COLUMN "crop" jsonb;--> statement-breakpoint
ALTER TABLE "payment_proofs" ADD CONSTRAINT "payment_proofs_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_cover_media_id_media_id_fk" FOREIGN KEY ("cover_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organizer_photos" ADD CONSTRAINT "organizer_photos_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organizer_profiles" ADD CONSTRAINT "organizer_profiles_logo_media_id_media_id_fk" FOREIGN KEY ("logo_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organizer_profiles" ADD CONSTRAINT "organizer_profiles_cover_media_id_media_id_fk" FOREIGN KEY ("cover_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "payment_proofs_media_id_index" ON "payment_proofs" USING btree ("media_id");--> statement-breakpoint
CREATE INDEX "events_cover_media_id_index" ON "events" USING btree ("cover_media_id");--> statement-breakpoint
CREATE INDEX "organizer_photos_media_id_index" ON "organizer_photos" USING btree ("media_id");--> statement-breakpoint
CREATE INDEX "organizer_profiles_logo_media_id_index" ON "organizer_profiles" USING btree ("logo_media_id");--> statement-breakpoint
CREATE INDEX "organizer_profiles_cover_media_id_index" ON "organizer_profiles" USING btree ("cover_media_id");--> statement-breakpoint
ALTER TABLE "organizer_photos" ADD CONSTRAINT "organizer_photos_source" CHECK ("organizer_photos"."url" is not null or "organizer_photos"."media_id" is not null);