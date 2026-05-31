import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

// Client per uso client-side
export const supabase = createClient(supabaseUrl, supabasePublishableKey);

// Client per operazioni server-side (usa la stessa publishable key nel nuovo formato Supabase)
export function createServiceClient() {
  return createClient(supabaseUrl, supabasePublishableKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Carica una foto nel bucket Supabase Storage
 */
export async function uploadPlatePhoto(
  file: File | Blob,
  userId: string,
  plateId: string
): Promise<string> {
  const client = createServiceClient();

  const fileName = `${userId}/${plateId}-${Date.now()}.jpg`;

  const { data, error } = await client.storage
    .from("plate-photos")
    .upload(fileName, file, {
      contentType: "image/jpeg",
      upsert: false,
    });

  if (error) throw new Error(`Upload failed: ${error.message}`);

  const { data: urlData } = client.storage
    .from("plate-photos")
    .getPublicUrl(data.path);

  return urlData.publicUrl;
}

/**
 * Elimina una foto dal bucket
 */
export async function deletePlatePhoto(photoUrl: string): Promise<void> {
  const client = createServiceClient();

  const url = new URL(photoUrl);
  const path = url.pathname.split("/plate-photos/")[1];

  if (!path) return;

  await client.storage.from("plate-photos").remove([path]);
}
