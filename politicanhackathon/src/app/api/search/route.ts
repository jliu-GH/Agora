import { NextRequest, NextResponse } from "next/server";
import { retrieve } from "@/lib/rag";

export async function POST(req: NextRequest) {
  try {
    const { query, k = 8 } = await req.json();
    const snippets = await retrieve(query, k);
    return NextResponse.json({ snippets });
  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
