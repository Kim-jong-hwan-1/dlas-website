"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

export default function Page() {
  // --- Login state ---
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const storedIsLoggedIn = localStorage.getItem("isLoggedIn");
    const storedExpireTime = localStorage.getItem("loginExpireTime");
  
    if (storedIsLoggedIn === "true" && storedExpireTime) {
      const expireTime = parseInt(storedExpireTime, 10);
      if (Date.now() < expireTime) {
        setIsLoggedIn(true);
  
        // ✅ 사용자 정보도 복원
        const storedUserStr = localStorage.getItem("DLASUser");
        if (storedUserStr) {
          try {
            const storedUser = JSON.parse(storedUserStr);
            setUserName(storedUser.userName || "");
            setUserId(storedUser.userId || "");
            setUserCountry(storedUser.userCountry || "");
            setUserPhone(storedUser.userPhone || "");
            setUserEmail(storedUser.userEmail || "");
          } catch (err) {
            console.error("Could not parse stored user data:", err);
          }
        }
      } else {
        localStorage.removeItem("isLoggedIn");
        localStorage.removeItem("loginExpireTime");
      }
    }
  }, []);
  

  // (2) Logout function
  const handleLogout = () => {
    // Remove login state
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("loginExpireTime");
    setIsLoggedIn(false);
    setShowMyModal(false);
  };

  // For the MY page modal
  const [showMyModal, setShowMyModal] = useState(false);

  // --- Signup states ---
  const [signupName, setSignupName] = useState("");
  const [signupId, setSignupId] = useState(""); // used as user ID
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirmPassword, setSignupConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [signupCountry, setSignupCountry] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [marketingAgree, setMarketingAgree] = useState(false);
  const [termsAgree, setTermsAgree] = useState(false);

  // --- For showing the MY info (stored after signup) ---
  const [userName, setUserName] = useState("");
  const [userId, setUserId] = useState("");
  const [userCountry, setUserCountry] = useState("");
  const [userPhone, setUserPhone] = useState("");
  const [userEmail, setUserEmail] = useState("");

  // --- Sign Up handler ---
  const handleSignupSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Password check
    if (signupPassword !== signupConfirmPassword) {
      setPasswordError("The passwords you entered do not match.");
      return;
    }

    // Terms must be agreed
    if (!termsAgree) {
      setPasswordError("You must agree to the Terms & Conditions.");
      return;
    }

    setPasswordError("");

    // Construct signup data
    const requestData = {
      email: signupId, // using "ID" as 'email' in the server's perspective
      password: signupPassword,
      name: signupName,
      country: signupCountry,
      workplace_name: phoneNumber, // phone
      workplace_address: signupEmail, // email
      marketing_agree: marketingAgree,
    };

    try {
      const res = await fetch("https://license-server-697p.onrender.com/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      });

      const text = await res.text();
      try {
        const data = JSON.parse(text);
        if (!res.ok) {
          const message =
            typeof data.detail === "object"
              ? JSON.stringify(data.detail)
              : data.detail || "Unknown error";
          alert(`Signup failed: ${message}`);
          return;
        }

        alert(`Signup success: ${data.message}`);

        // Store user info in localStorage (for later "MY" modal)
        const userData = {
          userName: signupName,
          userId: signupId,
          userCountry: signupCountry,
          userPhone: phoneNumber,
          userEmail: signupEmail,
        };
        localStorage.setItem("DLASUser", JSON.stringify(userData));

        // Close signup modal
        document.getElementById("signup-modal")?.classList.add("hidden");
      } catch (e) {
        console.error("JSON parse error", text);
        alert("Invalid response from server.");
      }
    } catch (err) {
      console.error("Signup error", err);
      alert("Network error");
    }
  };

  // --- Login states ---
  const [idForLogin, setIdForLogin] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // (3) Login handler
  const handleLoginSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const requestData = {
      email: idForLogin,
      password: loginPassword,
    };

    try {
      const response = await fetch("https://license-server-697p.onrender.com/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const message =
          typeof errorData.detail === "object"
            ? JSON.stringify(errorData.detail)
            : errorData.detail ||
              errorData.message ||
              "Unknown error";
        alert(`Login error: ${message}`);
        return;
      }

      // Login success
      alert("Login success!");
      setIsLoggedIn(true);

      // Set expiry in 1 hour
      const oneHourLater = Date.now() + 60 * 60 * 1000; 
      localStorage.setItem("isLoggedIn", "true");
      localStorage.setItem("loginExpireTime", oneHourLater.toString());

      // If we have stored signup data and the ID matches, load it for MY modal
      const storedUserStr = localStorage.getItem("DLASUser");
      if (storedUserStr) {
        try {
          const storedUser = JSON.parse(storedUserStr);
          if (storedUser.userId === idForLogin) {
            setUserName(storedUser.userName || "");
            setUserId(storedUser.userId || "");
            setUserCountry(storedUser.userCountry || "");
            setUserPhone(storedUser.userPhone || "");
            setUserEmail(storedUser.userEmail || "");
          }
        } catch (err) {
          console.error("Could not parse stored user data:", err);
        }
      }

      // Close login modal
      document.getElementById("login-modal")!.classList.add("hidden");
    } catch (error) {
      console.error("Login error:", error);
      if (error instanceof Error) {
        alert(`Login error: ${error.message}`);
      } else {
        alert("Unknown login error occurred.");
      }
    }
  };

  // Countries list
  const countries = [
    "Afghanistan","Albania","Algeria","Andorra","Angola","Antigua and Barbuda",
    "Argentina","Armenia","Australia","Austria","Azerbaijan","Bahamas","Bahrain",
    "Bangladesh","Barbados","Belarus","Belgium","Belize","Benin","Bhutan","Bolivia",
    "Bosnia and Herzegovina","Botswana","Brazil","Brunei","Bulgaria","Burkina Faso",
    "Burundi","Cabo Verde","Cambodia","Cameroon","Canada","Central African Republic",
    "Chad","Chile","China","Colombia","Comoros","Congo (Brazzaville)","Congo (Kinshasa)",
    "Costa Rica","Croatia","Cuba","Cyprus","Czech Republic","Denmark","Djibouti",
    "Dominica","Dominican Republic","Ecuador","Egypt","El Salvador","Equatorial Guinea",
    "Eritrea","Estonia","Eswatini","Ethiopia","Fiji","Finland","France","Gabon",
    "Gambia","Georgia","Germany","Ghana","Greece","Grenada","Guatemala","Guinea",
    "Guinea-Bissau","Guyana","Haiti","Honduras","Hungary","Iceland","India","Indonesia",
    "Iran","Iraq","Ireland","Israel","Italy","Jamaica","Japan","Jordan","Kazakhstan",
    "Kenya","Kiribati","Kuwait","Kyrgyzstan","Laos","Latvia","Lebanon","Lesotho",
    "Liberia","Libya","Liechtenstein","Lithuania","Luxembourg","Madagascar","Malawi",
    "Malaysia","Maldives","Mali","Malta","Marshall Islands","Mauritania","Mauritius",
    "Mexico","Micronesia","Moldova","Monaco","Mongolia","Montenegro","Morocco",
    "Mozambique","Myanmar","Namibia","Nauru","Nepal","Netherlands","New Zealand",
    "Nicaragua","Niger","Nigeria","North Korea","North Macedonia","Norway","Oman",
    "Pakistan","Palau","Palestine","Panama","Papua New Guinea","Paraguay","Peru",
    "Philippines","Poland","Portugal","Qatar","Romania","Russia","Rwanda",
    "Saint Kitts and Nevis","Saint Lucia","Saint Vincent and the Grenadines",
    "Samoa","San Marino","Sao Tome and Principe","Saudi Arabia","Senegal",
    "Serbia","Seychelles","Sierra Leone","Singapore","Slovakia","Slovenia",
    "Solomon Islands","Somalia","South Africa","South Korea","South Sudan",
    "Spain","Sri Lanka","Sudan","Suriname","Sweden","Switzerland","Syria",
    "Taiwan","Tajikistan","Tanzania","Thailand","Timor-Leste","Togo","Tonga",
    "Trinidad and Tobago","Tunisia","Turkey","Turkmenistan","Tuvalu","Uganda",
    "Ukraine","United Arab Emirates","United Kingdom","United States","Uruguay",
    "Uzbekistan","Vanuatu","Vatican City","Venezuela","Vietnam","Yemen",
    "Zambia","Zimbabwe"
  ];

  // Scroll to sections logic
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tab = urlParams.get("tab");
    if (tab) {
      const target = document.getElementById(tab);
      if (target) {
        setTimeout(() => {
          window.scrollTo({
            top: tab === "home" ? 0 : target.offsetTop - 160,
            behavior: "smooth",
          });
        }, 100);
      }
    }
  }, []);

  const scrollToSection = (id: string) => {
    if (id === "home") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      window.history.replaceState(null, "", `/?tab=${id}`);
      return;
    }
    const el = document.getElementById(id);
    if (el) {
      window.scrollTo({
        top: el.offsetTop - 160,
        behavior: "smooth",
      });
      window.history.replaceState(null, "", `/?tab=${id}`);
    }
  };

  // Modules list
  const modules = [
    "Bite Finder",
    "Transfer Jig Maker",
    "Fast & Easy Modifier",
    "Printing Model maker",
    "Image Converter",
    "HTML Viewer Converter",
    "STL Classifier",
    "Crown Cad",
    "Denture Cad",
  ];

  // Family license modals
  const [showComingSoonModal, setShowComingSoonModal] = useState(false);
  const [showFamilyModal, setShowFamilyModal] = useState(false);

  return (
    <div className="min-h-screen bg-white text-black relative">
      {/* Logo (PC only) */}
      <Image
        src="/left-up.png"
        alt="Top Left Logo"
        width={120}
        height={120}
        className="fixed top-4 left-4 z-50 hidden sm:block"
      />

      {/* Top Navigation */}
      <nav className="fixed top-0 left-0 w-full bg-white py-4 px-8 shadow-lg z-40">
        <div className="flex justify-center items-center relative">
          <Image
            src="/logo.png"
            alt="DLAS Logo"
            width={600}
            height={400}
            className="object-contain max-w-full sm:max-w-[600px] mx-auto mt-[80px] sm:mt-0 mb-0 sm:mb-0"
            priority
          />
          {/* Nav menu (hidden on mobile, visible on sm+) */}
          <div className="absolute bottom-2 right-4 sm:right-8 hidden sm:flex flex-wrap items-center gap-x-4 gap-y-2">
            {["home", "download", "buy", "contact"].map((tab) => (
              <button
                key={tab}
                onClick={() => scrollToSection(tab)}
                className="relative pb-2 transition-colors duration-200 cursor-pointer
                           border-b-2 border-transparent hover:border-black 
                           text-gray-700 hover:text-black"
              >
                {tab.toUpperCase()}
              </button>
            ))}
            {/* Terms & Privacy */}
            <button
              onClick={() => scrollToSection("terms-privacy")}
              className="relative pb-2 transition-colors duration-200 cursor-pointer
                         border-b-2 border-transparent hover:border-black
                         text-gray-700 hover:text-black"
            >
              TERMS
            </button>
          </div>
        </div>
      </nav>

      {/* Login & Signup (or MY & Logout) buttons */}
      <div
        className="
          fixed 
          top-6 left-6
          sm:top-6 sm:right-6 sm:left-auto
          flex gap-2 z-50
        "
      >
        {!isLoggedIn ? (
          <>
            <button
              onClick={() =>
                document.getElementById("login-modal")!.classList.remove("hidden")
              }
              className="text-sm font-medium border border-gray-300 px-4 py-2 rounded hover:bg-gray-100 transition"
            >
              Login
            </button>
            <button
              onClick={() =>
                document.getElementById("signup-modal")!.classList.remove("hidden")
              }
              className="text-sm font-medium border border-gray-300 px-4 py-2 rounded hover:bg-gray-100 transition"
            >
              Sign Up
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setShowMyModal(true)}
              className="text-sm font-medium border border-gray-300 px-4 py-2 rounded hover:bg-gray-100 transition"
            >
              MY
            </button>
            <button
              onClick={handleLogout}
              className="text-sm font-medium border border-gray-300 px-4 py-2 rounded hover:bg-gray-100 transition"
            >
              Logout
            </button>
          </>
        )}
      </div>

      <main className="pt-[180px]">
        {/* Home Section */}
        <section id="home" className="scroll-mt-[180px] text-center py-20">
          <p className="text-xl text-gray-300 mb-2">
            <span className="text-5xl font-bold block">
              The Next Big Thing
            </span>
          </p>
          <h1 className="text-6xl font-bold mb-8">
            DLAS - Dental Lab Automation System
          </h1>
          <button
            onClick={() => setShowFamilyModal(true)}
            className="text-2xl font-bold cursor-pointer mt-6 bg-black text-white px-10 py-6 rounded hover:bg-gray-800 transition"
          >
            Buy Now (Family License)
          </button>
          <div className="mt-16 px-6 max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-semibold mb-4 text-gray-900">
              A Game Changer in Dental Automation
            </h2>
            <p className="text-lg text-gray-600 leading-relaxed mb-4">
              Automate your lab tasks efficiently and effectively.  
              Experience the latest in dental technology all in one place.
            </p>
            <p className="italic text-2xl text-gray-800 font-medium">
              "Revolutionizing Dental Labs Worldwide"
            </p>
          </div>
        </section>

        {/* Download Section */}
        <section
          id="download"
          className="scroll-mt-[180px] text-center py-20 bg-gray-100"
        >
          <h2 className="text-4xl font-bold mb-4">Download DLAS</h2>
          <p className="text-lg text-gray-500 max-w-3xl mx-auto mt-2">
            Get the latest version of DLAS software.  
            Compatible with Windows 10 and above.
          </p>
          <a
            href="/downloads/DLAS_Setup.exe"
            download
            className="inline-block mt-6 bg-black text-white px-8 py-4 rounded hover:bg-gray-800 transition"
          >
            Download Now
          </a>
        </section>

        {/* Buy Section */}
        <section id="buy" className="scroll-mt-[180px] py-20 px-10 bg-white">
          <h1 className="text-4xl font-bold mb-6 text-center">
            Purchase Modules
          </h1>

          {/* Family License Card */}
          <div
            className="mb-12 w-[28rem] h-[36rem] border p-10 rounded-lg shadow hover:shadow-lg transition flex flex-col items-center mx-auto cursor-pointer"
            onClick={() => setShowFamilyModal(true)}
          >
            <div className="w-[28rem] h-[28rem] bg-gray-100 mb-6 px-8 flex items-center justify-center">
              <span className="text-gray-400">Family License Gif Placeholder</span>
            </div>
            <div className="text-lg font-semibold text-center text-gray-800">
              Family License
            </div>
          </div>

          {/* Individual Modules */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 justify-items-center">
            {modules.map((mod, i) => (
              <div
                key={i}
                className="w-[28rem] h-[36rem] border p-10 rounded-lg shadow hover:shadow-lg transition flex flex-col items-center"
              >
                <div className="w-[28rem] h-[28rem] bg-gray-200 mb-6 px-8 flex items-center justify-center">
                  {mod === "Transfer Jig Maker" ? (
                    <Image
                      src="/gifs/transfer_jig.gif"
                      alt={`${mod} gif`}
                      width={200}
                      height={200}
                      className="object-contain"
                    />
                  ) : (
                    <span className="text-gray-400 text-2xl font-bold">
                      Coming Soon
                    </span>
                  )}
                </div>
                <div className="text-xl font-semibold text-center text-gray-800">
                  {mod}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Contact Section */}
        <section
          id="contact"
          className="scroll-mt-[180px] py-20 text-center bg-gray-100"
        >
          <h2 className="text-4xl font-bold">Contact Us</h2>
          <p className="text-lg text-gray-500 max-w-3xl mx-auto mt-4">
            For any inquiries, please reach out:
            <br />
            Email: support@dlas.io
            <br />
            Phone (Korea): +82-10-9756-1992
            <br />
            Kakao: messso
            <br />
            WhatsApp:{" "}
            <a
              href="https://wa.me/821097561992"
              target="_blank"
              rel="noopener noreferrer"
            >
              wa.me/821097561992
            </a>
          </p>
        </section>

        {/* Terms & Privacy Section */}
        <section
          id="terms-privacy"
          className="scroll-mt-[180px] py-20 px-6 bg-white"
        >
          <div className="max-w-4xl mx-auto text-left leading-7 text-gray-700">
            <h2 className="text-4xl font-bold mb-8 text-center">
              Terms & Privacy
            </h2>

            <h3 className="text-2xl font-bold mb-4">Terms of Service</h3>
            <p className="mb-4">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Phasellus
              eu dictum nulla. Phasellus maximus augue vel diam cursus, eu
              laoreet tortor commodo. In semper nunc non sem placerat blandit.
            </p>
            <p className="mb-4">
              Suspendisse potenti. Curabitur fermentum ornare nulla, a
              pellentesque orci cursus et. Integer viverra, urna nec rutrum
              congue, nibh metus tincidunt mi, vel suscipit sem mauris eget
              metus.
            </p>
            <p className="mb-12">
              <strong>Effective date: January 1st, 2025</strong>
            </p>

            <h3 className="text-2xl font-bold mb-4">Privacy Policy</h3>
            <p className="mb-4">
              Donec sed ante sit amet nunc mollis blandit nec eget est. Integer
              at accumsan quam. Aenean sed lacus vulputate, luctus massa a,
              pulvinar odio. Sed auctor neque at nibh cursus laoreet.
            </p>
            <p className="mb-4">
              Aenean tempor efficitur est, eget malesuada metus laoreet quis.
              Integer scelerisque purus massa, eget faucibus mauris porta at.
            </p>
            <p className="mb-4">
              <strong>Effective date: January 1st, 2025</strong>
            </p>
          </div>
        </section>

        {/* Family License Modal */}
        {showFamilyModal && (
          <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center px-6 py-10 overflow-y-auto">
            <div className="bg-white p-8 rounded-xl shadow-xl w-full max-w-[1100px] h-fit relative">
              <button
                onClick={() => setShowFamilyModal(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-black text-2xl"
              >
                ×
              </button>
              <h2 className="text-3xl font-bold mb-4 text-center">
                Family License
              </h2>

              <div className="text-gray-700 text-sm leading-relaxed space-y-2 mb-6">
                <p>
                  The Family License grants you lifetime free access to all
                  modules released before version 2.0.0.
                </p>
                <p>
                  After version 2.0.0, Family License users receive major
                  discounts on newly released modules.
                </p>
                <p>
                  This is a special promotion only available before the official
                  v2.0.0 release.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm border border-gray-300 mb-4 whitespace-nowrap">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="p-2 border text-left">Module</th>
                      <th className="p-2 border text-center">
                        General User
                        <br />
                        <span className="text-xs text-gray-600">
                          (After v2.0.0)
                        </span>
                      </th>
                      <th className="p-2 border text-center">
                        Family
                        <br />
                        <span className="text-xs text-orange-600 font-bold">
                          (Before v2.0.0)
                        </span>
                      </th>
                      <th className="p-2 border text-left">Description</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs">
                    {[
                      [
                        "Transfer Jig Maker",
                        "$790",
                        "Free for life",
                        "Automated jig generation software",
                      ],
                      [
                        "STL Classifier (Expected May 2025)",
                        "$590",
                        "Free for life",
                        "Classify STL by color and height",
                      ],
                      [
                        "HTML Viewer Converter (Expected May 2025)",
                        "$390",
                        "Free for life",
                        "Convert STL to HTML viewer",
                      ],
                      [
                        "Image Converter (Expected May 2025)",
                        "$390",
                        "Free for life",
                        "Convert STL to image quickly",
                      ],
                      [
                        "Printing Model Maker (Expected June 2025)",
                        "$590",
                        "Free for life",
                        "Lightweight model creator",
                      ],
                      [
                        "Bite Finder (Expected June 2025)",
                        "$1,090",
                        "Free for life",
                        "Revolutionary bite locator",
                      ],
                      [
                        "Fast & Easy Modifier (Expected June 2025)",
                        "$590",
                        "Free for life",
                        "Quick modifier (hook, hole, attachment)",
                      ],
                      [
                        "Denture CAD (Expected 2025)",
                        "$790",
                        "Free for life",
                        "Arrangement library, labial facing, custom tray",
                      ],
                      [
                        "Crown CAD (Expected 2025)",
                        "$790",
                        "Free for life",
                        "Integrated crown CAD features",
                      ],
                      ["...new module 1 (Coming Soon)", "$790", "Free for life", ""],
                      ["...new module 2 (Coming Soon)", "$790", "Free for life", ""],
                      ["...new module 3 (Coming Soon)", "$790", "Free for life", ""],
                      ["AI DLAS CAD (Expected 2026)", "$59/month", "$5.9/month", ""],
                    ].map(([title, price1, price2, desc], idx) => (
                      <tr key={idx}>
                        <td className="p-2 border">{title}</td>
                        <td className="p-2 border text-center">{price1}</td>
                        <td className="p-2 border text-center">{price2}</td>
                        <td className="p-2 border">{desc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="text-xs text-gray-500 text-right mt-2">
                  *All pricing is subject to change.
                </p>
              </div>

              <div className="text-center mt-6">
                <button
                  className="bg-black text-white px-8 py-3 rounded hover:bg-gray-800 transition"
                  onClick={() =>
                    alert("Please contact us for payment details.")
                  }
                >
                  Proceed to Payment
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Login Modal */}
      <div
        id="login-modal"
        className="fixed inset-0 z-50 hidden bg-black bg-opacity-50 flex items-center justify-center"
      >
        <div className="bg-white w-full max-w-md p-8 rounded-lg shadow-xl relative">
          <button
            className="absolute top-2 right-3 text-gray-500 hover:text-black"
            onClick={() =>
              document.getElementById("login-modal")!.classList.add("hidden")
            }
          >
            ×
          </button>
          <h2 className="text-2xl font-bold mb-4 text-center">Login</h2>
          <form className="space-y-4" onSubmit={handleLoginSubmit}>
            <input
              type="text"
              placeholder="ID"
              value={idForLogin}
              onChange={(e) => setIdForLogin(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded"
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded"
              required
            />
            <button
              type="submit"
              className="w-full bg-black text-white py-3 rounded hover:bg-gray-800"
            >
              Log In
            </button>
          </form>
          <p className="mt-4 text-center text-sm text-gray-500">
            Don't have an account?{" "}
            <a
              href="#"
              className="text-blue-600 hover:underline"
              onClick={(e) => {
                e.preventDefault();
                document.getElementById("login-modal")!.classList.add("hidden");
                document
                  .getElementById("signup-modal")!
                  .classList.remove("hidden");
              }}
            >
              Sign up now
            </a>
          </p>
        </div>
      </div>

      {/* Sign Up Modal */}
      <div
        id="signup-modal"
        className="fixed inset-0 z-50 hidden bg-black bg-opacity-50 flex items-center justify-center"
      >
        <div className="bg-white w-full max-w-md p-8 rounded-lg shadow-xl relative">
          <button
            className="absolute top-2 right-3 text-gray-500 hover:text-black"
            onClick={() =>
              document.getElementById("signup-modal")!.classList.add("hidden")
            }
          >
            ×
          </button>
          <h2 className="text-2xl font-bold mb-4 text-center">
            Sign Up
          </h2>
          <form className="space-y-4" onSubmit={handleSignupSubmit}>
            <input
              type="text"
              placeholder="Name"
              value={signupName}
              onChange={(e) => setSignupName(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded"
              required
            />
            <input
              type="text"
              placeholder="ID"
              className="w-full p-3 border border-gray-300 rounded"
              value={signupId}
              onChange={(e) => setSignupId(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Password"
              className="w-full p-3 border border-gray-300 rounded"
              value={signupPassword}
              onChange={(e) => setSignupPassword(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Confirm Password"
              className="w-full p-3 border border-gray-300 rounded"
              value={signupConfirmPassword}
              onChange={(e) => setSignupConfirmPassword(e.target.value)}
              required
            />
            {passwordError && (
              <p className="text-red-500 text-sm">{passwordError}</p>
            )}

            <select
              value={signupCountry}
              onChange={(e) => setSignupCountry(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded"
              required
            >
              <option value="">Select your country</option>
              {countries.map((c, index) => (
                <option key={index} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <input
              type="text"
              placeholder="Phone number (used for password recovery)"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded"
              required
            />
            <input
              type="text"
              placeholder="Email (used for password recovery)"
              value={signupEmail}
              onChange={(e) => setSignupEmail(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded"
              required
            />

            {/* Terms & Marketing */}
            <div className="text-sm text-gray-600 mt-4 space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={termsAgree}
                  onChange={(e) => setTermsAgree(e.target.checked)}
                  className="form-checkbox h-5 w-5 text-black"
                />
                <span className="ml-2">
                  I agree to the Terms & Privacy (required)
                </span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={marketingAgree}
                  onChange={(e) => setMarketingAgree(e.target.checked)}
                  className="form-checkbox h-5 w-5 text-black"
                />
                <span className="ml-2">
                  I agree to receive marketing information (optional)
                </span>
              </label>
            </div>

            <button
              type="submit"
              className="w-full bg-black text-white py-3 rounded hover:bg-gray-800"
            >
              Sign Up
            </button>
          </form>
        </div>
      </div>

      {/* MY Modal (shows user info) */}
      {showMyModal && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center px-6 py-10 overflow-y-auto">
          <div className="bg-white p-8 rounded-xl shadow-xl w-full max-w-md relative">
            <button
              onClick={() => setShowMyModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-black text-2xl"
            >
              ×
            </button>
            <h2 className="text-2xl font-bold mb-6 text-center">
              My Information
            </h2>
            <div className="space-y-4 text-gray-700 text-sm">
              <p><strong>Name:</strong> {userName || "N/A"}</p>
              <p><strong>ID:</strong> {userId || "N/A"}</p>
              <p><strong>Country:</strong> {userCountry || "N/A"}</p>
              <p><strong>Phone:</strong> {userPhone || "N/A"}</p>
              <p><strong>Email:</strong> {userEmail || "N/A"}</p>
            </div>
            <div className="text-center mt-6">
              <button
                className="bg-black text-white px-8 py-3 rounded hover:bg-gray-800 transition"
                onClick={() => setShowMyModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-black text-white py-10 px-6 text-center mt-20">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-sm">
            © {new Date().getFullYear()} DLAS. All rights reserved.
          </div>
          <div className="flex gap-4">
            <a
              href="https://www.youtube.com/@Dlas-official-e6k"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-red-500"
            >
              YouTube
            </a>
            <a
              href="https://www.instagram.com/dlas_official_"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-pink-400"
            >
              Instagram
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
