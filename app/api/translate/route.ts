import { NextResponse } from 'next/server';
import OpenAI from 'openai';  // ✅ 추가

const openai = new OpenAI({ apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY! });

export async function POST(req: Request) {
  const { text, targetLang } = await req.json();

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo-0125",  // ✅ 여기 모델명 변경
      messages: [
        { role: "system", content: `Translate to ${targetLang}` },
        { role: "user", content: text }
      ]
    });
    const translated = response.choices[0].message.content;
    return NextResponse.json({ translated });
  } catch (error) {
    console.error("Translation failed:", error);
    return NextResponse.json({ translated: text });
  }
}
