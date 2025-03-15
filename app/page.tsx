"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";

export default function Home() {
  const [licenseKey, setLicenseKey] = useState("");
  const [licenseStatus, setLicenseStatus] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"home" | "download" | "contact">("home");

  const checkLicense = async () => {
    const response = await fetch("/api/check-license", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: licenseKey }),
    });
    const data = await response.json();
    setLicenseStatus(
      data.valid ? "✅ 유효한 라이센스입니다!" : "❌ 유효하지 않은 라이센스입니다."
    );
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <nav className="w-full bg-black py-4 px-8 relative flex justify-center items-center shadow-lg">
        <Image
          src="/logo.png"
          alt="DLAS Logo"
          width={600}
          height={400}
          className="object-contain"
          priority
        />
        <div className="absolute bottom-2 right-8 flex items-center space-x-8">
          {["home", "download", "contact"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as "home" | "download" | "contact")}
              className={`relative pb-2 transition-colors duration-200 cursor-pointer ${
                activeTab === tab ? "border-b-2 border-white text-white" : "text-gray-300 hover:text-white"
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
          <div className="flex items-center space-x-4">
            <Button className="bg-gray-800 text-white px-4 py-2 rounded-lg hover:bg-gray-700 cursor-pointer">
              Login
            </Button>
            <Button className="bg-gray-800 text-white px-4 py-2 rounded-lg hover:bg-gray-700 cursor-pointer">
              Sign Up
            </Button>
          </div>
        </div>
      </nav>
      <main>
        {activeTab === "home" && (
          <section className="text-center py-20">
            <p className="text-xl text-gray-300 mb-2">Maximize Productivity with Just One Click</p>
            <h1 className="text-6xl font-bold mb-8">From Hours to Seconds</h1>
            <Button
              onClick={() => setActiveTab("download")}
              className="bg-white text-black px-6 py-3 rounded-lg hover:bg-gray-300 cursor-pointer"
            >
              Download
            </Button>
          </section>
        )}
        {activeTab === "download" && (
          <section className="text-center py-20">
            <h2 className="text-4xl font-bold">Download Page</h2>
            <p className="text-lg text-gray-400 max-w-3xl mx-auto mt-4">
              다운로드 관련 정보나 링크를 넣어 보세요.
            </p>
            <Button className="mt-6 bg-white text-black px-6 py-3 rounded-lg hover:bg-gray-300 cursor-pointer">
              Download Now
            </Button>
          </section>
        )}
        {activeTab === "contact" && (
          <section className="py-20 text-center">
            <h2 className="text-4xl font-bold">Contact Us</h2>
            <p className="text-lg text-gray-400 max-w-3xl mx-auto mt-4">
              +123-4567-8912 | business@email.com
              <br /> 123 Rome St. Penshurst RD, CA 997
            </p>
            <form className="mt-6 max-w-2xl mx-auto bg-gray-900 p-6 rounded-lg">
              <div className="grid grid-cols-2 gap-4">
                <input type="text" placeholder="First name" className="p-3 bg-gray-800 text-white rounded-lg" />
                <input type="text" placeholder="Last name" className="p-3 bg-gray-800 text-white rounded-lg" />
                <input type="email" placeholder="Email address" className="p-3 bg-gray-800 text-white rounded-lg col-span-2" />
                <input type="text" placeholder="Phone number" className="p-3 bg-gray-800 text-white rounded-lg col-span-2" />
                <textarea placeholder="Message" className="p-3 bg-gray-800 text-white rounded-lg col-span-2" rows={4}></textarea>
              </div>
              <Button className="mt-6 bg-white text-black px-6 py-3 rounded-lg hover:bg-gray-300 w-full cursor-pointer">
                Inquire Now
              </Button>
            </form>
          </section>
        )}
      </main>
      <footer className="text-center py-6 bg-black border-t border-gray-700">
        <p className="text-gray-400">© 2024. All Rights Reserved.</p>
      </footer>
    </div>
  );
}
