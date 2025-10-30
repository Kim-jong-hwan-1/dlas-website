'use client';
import Image from 'next/image';
import Link from 'next/link';

export default function BuyPage() {
  const modules = [
    {
      image: 'stl_to_html.png',
      name: 'STL to HTML',
      videoUrl: 'https://youtu.be/cMuSQO5zKt8?si=Sm_CcexV4GerU9se'
    },
    {
      image: 'stl_to_image.png',
      name: 'STL to Image',
      videoUrl: 'https://youtu.be/tnUM0i6RRG8?si=J53u7hZMde7FugUd'
    },
    {
      image: 'stl_classifier.png',
      name: 'STL Classifier',
      videoUrl: 'https://youtu.be/z32LXLfLEyM?si=_waxduDi6xQrSsov'
    },
    {
      image: 'exo_abutment_editor.png',
      name: 'Abutment Editor',
      videoUrl: 'https://youtu.be/CC7FbcueG48?si=VoipfnDAJ_wDmc7Q'
    },
    {
      image: '3_transfer_jig_maker.png',
      name: '3 Transfer Jig Maker',
      videoUrl: 'https://youtu.be/FAtEIxAN-UY?si=RAKm-TSXcwjN7yJt'
    },
    {
      image: 'e_transfer_jig_maker.png',
      name: 'E Transfer Jig Maker',
      videoUrl: 'https://youtu.be/FAtEIxAN-UY?si=RAKm-TSXcwjN7yJt'
    },
  ];

  return (
    <div className="min-h-screen bg-white text-black">
      <nav className="w-full bg-white py-4 px-8 relative flex justify-center items-center shadow-lg">
        <Image
          src="/logo.png"
          alt="DLAS Logo"
          width={600}
          height={400}
          className="object-contain"
          priority
        />
        <div className="absolute bottom-2 right-8 flex items-center space-x-8">
          {["home", "download", "buy", "contact"].map((tab) => {
            const href = tab === "home" ? "/" : `/?tab=${tab}`;
            const isActive = tab === "buy";
            return (
              <Link
                key={tab}
                href={href}
                className={
                  "relative pb-2 transition-colors duration-200 cursor-pointer " +
                  (isActive
                    ? "border-b-2 border-black text-black"
                    : "text-gray-300 hover:text-black")
                }
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Link>
            );
          })}
        </div>
      </nav>

      <main className="p-10">
        {/* 2.2.24 업데이트 소개 영상 */}
        <div className="max-w-4xl mx-auto mb-12">
          <h2 className="text-3xl font-bold mb-6 text-center">2.2.24 Version Update</h2>
          <div className="aspect-video w-full">
            <iframe
              className="w-full h-full rounded-lg shadow-lg"
              src="https://www.youtube.com/embed/U3W8LVJTFyU"
              title="2.2.24 Version Update"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            ></iframe>
          </div>
        </div>

        <h1 className="text-2xl font-bold mb-6 text-center mt-16">Buy Modules</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {modules.map((mod, i) => (
            <div key={i} className="border p-4 rounded-lg shadow hover:shadow-lg transition">
              <Image src={`/modules/${mod.image}`} alt={mod.name} width={400} height={300} />
              <h3 className="text-lg font-semibold mt-3 mb-2 text-center">{mod.name}</h3>
              <div className="flex flex-col gap-2">
                <a
                  href={mod.videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full bg-red-600 text-white py-2 rounded hover:bg-red-700 text-center transition"
                >
                  Watch Video
                </a>
                <button className="w-full bg-black text-white py-2 rounded hover:bg-gray-800 transition">
                  Buy Now
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}