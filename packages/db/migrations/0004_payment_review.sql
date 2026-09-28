ALTER TABLE "orders" ADD COLUMN "locale" "locale" DEFAULT 'fr' NOT NULL;--> statement-breakpoint
ALTER TABLE "payment_proofs" ADD COLUMN "rejection_reason" text;