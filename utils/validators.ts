import { z } from "zod";

export const phoneSchema = z
  .string()
  .min(10, "Phone number must be at least 10 digits")
  .max(13, "Phone number too long")
  .regex(/^[+\d\s-]+$/, "Invalid phone number");

export const otpSchema = z
  .string()
  .length(6, "OTP must be 6 digits")
  .regex(/^\d+$/, "OTP must contain only digits");

export const phone10Schema = z
  .string()
  .regex(/^\d{10}$/, "Enter a valid 10 digit number");

export const otp4Schema = z
  .string()
  .regex(/^\d{4}$/, "Enter the 4 digit code");

export const bookPickupSchema = z.object({
  oil_type: z.string().min(1, "Please select oil type"),
  quantity: z
    .number({ invalid_type_error: "Quantity must be a number" })
    .positive("Quantity must be greater than 0")
    .max(100000, "Quantity too large"),
  unit: z.string().min(1, "Please select unit"),
  pickup_date: z.string().min(1, "Please select pickup date"),
  address: z.string().min(5, "Address must be at least 5 characters"),
  notes: z.string().optional(),
});

export const pickupFormSchema = z.object({
  actual_quantity: z
    .number({ invalid_type_error: "Enter valid quantity" })
    .positive("Quantity must be > 0"),
  unit: z.string().min(1, "Select unit"),
  grade: z.enum(["A", "B", "C"]).optional(),
  condition: z.string().optional(),
  container_type: z.string().optional(),
  notes: z.string().optional(),
});

export const profileSchema = z.object({
  full_name: z.string().min(2, "Name must be at least 2 characters"),
  business_name: z.string().optional(),
  address: z.string().optional(),
  vehicle_number: z.string().optional(),
});

export type BookPickupForm = z.infer<typeof bookPickupSchema>;
export type PickupFormData = z.infer<typeof pickupFormSchema>;
export type ProfileFormData = z.infer<typeof profileSchema>;
