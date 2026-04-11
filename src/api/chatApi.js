// src/api/chatApi.js
export async function askChecklistAI(message) {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;

  if (!apiKey) {
    console.error("❌ OpenAI API Key is missing in .env");
    return { error: "API Key Missing" };
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4.1",
        messages: [
          {
            role: "system",
            content:
              "너는 자전거 여행 AI 코스 추천 전문가야. 사용자의 여행 취향(스타일 테스트 결과)을 분석하여 맞춤 여행지, 숙소, 음식, 라이딩 코스를 제안해줘.",
          },
          {
            role: "user",
            content: message,
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    const data = await response.json();
    return { answer: data.choices[0].message.content };

  } catch (error) {
    console.error("❌ OpenAI API Request Error:", error);
    return { error: "AI 응답 중 오류가 발생했습니다." };
  }
}
