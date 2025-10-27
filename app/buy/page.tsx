'use client';
import Image from 'next/image';
import Link from 'next/link';

export default function BuyPage() {
  const modules = [
    '3_transfer_jig_maker.png',
    'e_transfer_jig_maker.png',
    'exo_abutment_editor.png',
    'stl_classifier.png',
    'stl_to_html.png',
    'stl_to_image.png',
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
        <h1 className="text-2xl font-bold mb-6 text-center">Buy Modules</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {modules.map((mod, i) => (
            <div key={i} className="border p-4 rounded-lg shadow hover:shadow-lg transition">
              <Image src={`/modules/${mod}`} alt={mod} width={400} height={300} />
              <button className="mt-4 w-full bg-black text-white py-2 rounded hover:bg-gray-800">
                Buy Now
              </button>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}