import React, { useEffect, useState } from 'react'
import {
  Menu, X, CheckCircle2, Zap, Coffee, Smartphone, ShieldCheck, PieChart,
  ChevronRight, PlayCircle, Star, Calculator, Layers, PlusCircle
} from 'lucide-react'

export default function LandingPage({ onLogin }) {
  const [isScrolled, setIsScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [navVisible, setNavVisible] = useState(true)

  useEffect(() => {
    let lastScrollY = window.scrollY
    const handleScroll = () => {
      const currentScrollY = window.scrollY
      setIsScrolled(currentScrollY > 20)
      
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setNavVisible(false)
      } else {
        setNavVisible(true)
      }
      lastScrollY = currentScrollY
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    // Add tailwind CSS dynamically just for the landing page
    const script = document.createElement('script')
    script.src = 'https://cdn.tailwindcss.com'
    script.onload = () => {
      window.tailwind.config = {
        theme: {
          extend: {
            colors: {
              primary: '#28c8b4',
              secondary: '#1f2937',
              accent: '#f59e0b',
            },
            animation: {
              'blob': 'blob 7s infinite',
              'fade-in-up': 'fadeInUp 0.8s ease-out forwards',
            },
            keyframes: {
              blob: {
                '0%': { transform: 'translate(0px, 0px) scale(1)' },
                '33%': { transform: 'translate(30px, -50px) scale(1.1)' },
                '66%': { transform: 'translate(-20px, 20px) scale(0.9)' },
                '100%': { transform: 'translate(0px, 0px) scale(1)' },
              },
              fadeInUp: {
                '0%': { opacity: '0', transform: 'translateY(20px)' },
                '100%': { opacity: '1', transform: 'translateY(0)' },
              }
            }
          }
        }
      }
    }
    document.head.appendChild(script)

    const style = document.createElement('style')
    style.innerHTML = `
      html { scroll-behavior: smooth; overflow: auto !important; height: auto !important; }
      body { margin: 0; background-color: #0f172a; overflow: auto !important; height: auto !important; }
      .glass-nav {
          background: rgba(15, 23, 42, 0.7);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      }
      .glass-card {
          background: rgba(30, 41, 59, 0.6);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
      }
      .gradient-text {
          background: linear-gradient(135deg, #28c8b4, #3b82f6);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
      }
      .mockup-shadow {
          box-shadow: 0 25px 50px -12px rgba(40, 200, 180, 0.25);
      }
    `
    document.head.appendChild(style)
  }, [])

  return (
    <div className="bg-slate-900 text-white font-sans antialiased overflow-x-hidden min-h-screen relative w-full">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/20 blur-[120px] mix-blend-screen animate-blob"></div>
        <div className="absolute top-[20%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-500/20 blur-[120px] mix-blend-screen animate-blob" style={{ animationDelay: '2s' }}></div>
        <div className="absolute bottom-[-20%] left-[20%] w-[50%] h-[50%] rounded-full bg-purple-500/20 blur-[120px] mix-blend-screen animate-blob" style={{ animationDelay: '4s' }}></div>
      </div>

      {/* Navbar */}
      <nav className={`fixed w-full z-50 transition-all duration-300 ${isScrolled ? 'glass-nav py-3' : 'bg-transparent py-5'} ${navVisible ? 'translate-y-0' : '-translate-y-full'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo(0, 0)}>
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center shadow-lg">
                <Coffee size={18} className="text-white" />
              </div>
              <span className="font-bold text-2xl tracking-tight text-white">Bestari<span className="text-primary">POS</span></span>
            </div>
            
            {/* Desktop Menu */}
            <div className="hidden md:flex items-center space-x-8">
              <a href="#fitur" className="text-slate-300 hover:text-white text-sm font-medium transition">Fitur Unggulan</a>
              <a href="#harga" className="text-slate-300 hover:text-white text-sm font-medium transition">Harga & Paket</a>
              <a href="#faq" className="text-slate-300 hover:text-white text-sm font-medium transition">FAQ</a>
            </div>

            <div className="hidden md:flex items-center gap-4">
              <button onClick={onLogin} className="text-slate-300 hover:text-white text-sm font-medium transition">Masuk</button>
              <button onClick={onLogin} className="bg-primary text-slate-900 px-5 py-2.5 rounded-full text-sm font-bold hover:bg-teal-400 transition-all transform hover:-translate-y-0.5 shadow-[0_0_15px_rgba(40,200,180,0.3)]">
                Coba Gratis Sekarang
              </button>
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden flex items-center">
              <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="text-slate-300 p-2">
                {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        <div className={`md:hidden absolute w-full glass-nav border-b border-slate-800 transition-all duration-300 overflow-hidden ${mobileMenuOpen ? 'max-h-96' : 'max-h-0 border-transparent'}`}>
          <div className="px-4 pt-2 pb-6 space-y-4 flex flex-col">
            <a href="#fitur" onClick={() => setMobileMenuOpen(false)} className="block text-slate-300 hover:text-white font-medium py-2">Fitur Unggulan</a>
            <a href="#harga" onClick={() => setMobileMenuOpen(false)} className="block text-slate-300 hover:text-white font-medium py-2">Harga & Paket</a>
            <hr className="border-slate-800 my-2" />
            <button onClick={onLogin} className="w-full text-left text-slate-300 hover:text-white font-medium py-2">Masuk Akun</button>
            <button onClick={onLogin} className="w-full bg-primary text-slate-900 px-5 py-3 rounded-xl font-bold hover:bg-teal-400 transition text-center">
              Coba Gratis
            </button>
          </div>
        </div>
      </nav>

      <main className="relative z-10 pt-20">
        {/* Hero Section */}
        <section className="pt-20 pb-20 lg:pt-32 lg:pb-32 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-12 lg:gap-8">
          <div className="flex-1 text-center lg:text-left animate-fade-in-up">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card border-primary/30 text-primary text-sm font-semibold mb-8">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              Sistem POS Tanpa Biaya Bulanan
            </div>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight mb-6 leading-[1.1]">
              Kelola Kedai Lebih <br className="hidden lg:block"/>
              <span className="gradient-text">Cepat & Pintar.</span>
            </h1>
            <p className="text-lg md:text-xl text-slate-400 mb-10 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
              BestariPOS adalah aplikasi kasir canggih yang bekerja 100% offline. Dilengkapi antrean barista, QRIS, dan manajemen add-on. Sekali beli, pakai selamanya.
            </p>
            <div className="flex flex-col sm:flex-row justify-center lg:justify-start gap-4">
              <button onClick={onLogin} className="bg-primary text-slate-900 px-8 py-4 rounded-xl font-bold text-lg hover:bg-teal-400 transition-all shadow-[0_0_20px_rgba(40,200,180,0.4)] hover:shadow-[0_0_30px_rgba(40,200,180,0.6)] flex items-center justify-center gap-2">
                <PlayCircle size={20} /> Lihat Demo
              </button>
              <a href="#fitur" className="glass-card text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-white/10 transition flex items-center justify-center">
                Pelajari Lebih Lanjut
              </a>
            </div>
            
            <div className="mt-12 flex items-center justify-center lg:justify-start gap-6 text-sm text-slate-400">
              <div className="flex items-center gap-2"><CheckCircle2 size={16} className="text-primary"/> Tanpa Internet</div>
              <div className="flex items-center gap-2"><CheckCircle2 size={16} className="text-primary"/> Beli Sekali</div>
              <div className="flex items-center gap-2"><CheckCircle2 size={16} className="text-primary"/> Mudah Dipakai</div>
            </div>
          </div>
          
          <div className="flex-1 w-full max-w-2xl lg:max-w-none relative animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            {/* Mockup Container */}
            <div className="relative rounded-2xl overflow-hidden glass-card border border-slate-700 mockup-shadow transform lg:rotate-[-2deg] hover:rotate-0 transition duration-500">
              {/* Mockup Header */}
              <div className="bg-slate-800/80 px-4 py-3 flex items-center gap-2 border-b border-slate-700">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                </div>
                <div className="mx-auto bg-slate-900/50 rounded text-xs px-4 py-1 text-slate-400 border border-slate-700 flex items-center gap-2">
                  <ShieldCheck size={12} className="text-primary" /> bestaripos.local
                </div>
              </div>
              {/* Mockup Body (Image representation) */}
              <div className="relative aspect-[4/3] bg-slate-900 p-4">
                {/* Simulated UI */}
                <div className="flex h-full gap-4">
                  <div className="w-16 rounded-xl bg-slate-800/50 border border-slate-700/50 flex flex-col items-center py-4 gap-4">
                    <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center mb-4"><Coffee size={16}/></div>
                    <div className="w-8 h-8 rounded-lg bg-slate-700/50"></div>
                    <div className="w-8 h-8 rounded-lg bg-slate-700/50"></div>
                    <div className="w-8 h-8 rounded-lg bg-slate-700/50"></div>
                  </div>
                  <div className="flex-1 flex flex-col gap-4">
                    <div className="h-12 rounded-xl bg-slate-800/50 border border-slate-700/50 flex items-center px-4 justify-between">
                       <div className="w-32 h-4 bg-slate-700 rounded"></div>
                       <div className="w-16 h-4 bg-slate-700 rounded"></div>
                    </div>
                    <div className="flex-1 grid grid-cols-3 gap-4">
                      {[1,2,3,4,5,6].map(i => (
                        <div key={i} className="rounded-xl bg-slate-800/50 border border-slate-700/50 p-3 flex flex-col justify-between">
                          <div className="w-10 h-10 rounded-lg bg-slate-700/50 mb-2"></div>
                          <div className="w-3/4 h-3 bg-slate-700 rounded mb-2"></div>
                          <div className="w-1/2 h-3 bg-primary/40 rounded"></div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="w-64 rounded-xl bg-slate-800/50 border border-slate-700/50 flex flex-col p-4">
                    <div className="w-24 h-4 bg-slate-700 rounded mb-6"></div>
                    <div className="flex-1 space-y-4">
                      <div className="h-12 bg-slate-700/30 rounded flex items-center px-3 gap-3">
                        <div className="w-8 h-8 bg-slate-600 rounded"></div>
                        <div className="flex-1"><div className="w-full h-2 bg-slate-600 rounded mb-2"></div><div className="w-1/2 h-2 bg-slate-600 rounded"></div></div>
                      </div>
                      <div className="h-12 bg-slate-700/30 rounded flex items-center px-3 gap-3">
                        <div className="w-8 h-8 bg-slate-600 rounded"></div>
                        <div className="flex-1"><div className="w-full h-2 bg-slate-600 rounded mb-2"></div><div className="w-1/2 h-2 bg-slate-600 rounded"></div></div>
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-slate-700">
                      <div className="h-10 bg-primary/20 text-primary rounded-lg flex items-center justify-center font-bold text-sm">
                        Total: Rp 85.000
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Floating Badge */}
            <div className="absolute -bottom-6 -left-6 glass-card px-6 py-4 rounded-2xl flex items-center gap-4 animate-bounce" style={{ animationDuration: '3s' }}>
              <div className="w-12 h-12 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center">
                <CheckCircle2 size={24} />
              </div>
              <div>
                <div className="text-sm text-slate-400">Status</div>
                <div className="font-bold text-white">100% Offline</div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Matrix */}
        <section id="fitur" className="py-24 bg-slate-900/50 relative border-y border-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-20">
              <h2 className="text-primary font-bold tracking-wide uppercase text-sm mb-3">Fitur Premium</h2>
              <h3 className="text-3xl md:text-5xl font-extrabold mb-6">Dirancang Untuk <span className="text-white">Pertumbuhan</span></h3>
              <p className="text-slate-400 max-w-2xl mx-auto text-lg">Setiap fitur yang kami buat berasal dari riset mendalam terhadap masalah operasional harian kedai kopi & restoran.</p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { icon: Zap, color: 'text-yellow-400', bg: 'bg-yellow-400/10', title: 'Super Cepat & Offline', desc: 'Tidak ada loading. Kasir berjalan sempurna meski internet toko sedang mati total.' },
                { icon: Calculator, color: 'text-rose-400', bg: 'bg-rose-400/10', title: 'Hitung HPP Otomatis', desc: 'Pantau harga pokok penjualan (HPP) setiap resep agar margin keuntungan bisnis Anda selalu terjaga akurat.' },
                { icon: Smartphone, color: 'text-blue-400', bg: 'bg-blue-400/10', title: 'QRIS & E-Wallet', desc: 'Dukung pembayaran modern langsung di layar tanpa repot ketik manual nominal di mesin EDC.' },
                { icon: Layers, color: 'text-indigo-400', bg: 'bg-indigo-400/10', title: 'Kategori Kustom', desc: 'Buat dan atur kategori produk sesuka Anda. Memudahkan kasir menemukan menu dalam hitungan detik.' },
                { icon: PlusCircle, color: 'text-orange-400', bg: 'bg-orange-400/10', title: 'Master Add-On Dinamis', desc: 'Atur Less Sugar, Extra Shot, atau Topping tambahan layaknya profesional dengan perhitungan harga otomatis.' },
                { icon: Menu, color: 'text-green-400', bg: 'bg-green-400/10', title: 'Layar Antrean Barista', desc: 'Pesanan kasir otomatis muncul di layar khusus barista. Kurangi kesalahan pembuatan pesanan.' },
                { icon: PieChart, color: 'text-purple-400', bg: 'bg-purple-400/10', title: 'Laporan Finansial', desc: 'Lihat margin keuntungan kotor dan bersih berdasarkan HPP dan biaya operasional langsung di app.' },
                { icon: Coffee, color: 'text-teal-400', bg: 'bg-teal-400/10', title: 'Varian Es & Panas', desc: 'Kelola pilihan ukuran (Cup Size) atau tipe minuman (Hot/Ice) dengan mudah pada satu menu produk.' },
                { icon: ShieldCheck, color: 'text-primary', bg: 'bg-primary/10', title: 'Auto-Backup Aman', desc: 'Sistem backup otomatis setiap hari untuk memastikan data riwayat penjualan Anda tidak akan pernah hilang.' },
              ].map((feat, i) => (
                <div key={i} className="glass-card p-8 rounded-3xl hover:-translate-y-2 transition-all duration-300 group border border-slate-800 hover:border-slate-600 text-center md:text-left flex flex-col items-center md:items-start">
                  <div className={`w-14 h-14 rounded-2xl ${feat.bg} ${feat.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                    <feat.icon size={28} strokeWidth={2} />
                  </div>
                  <h4 className="text-xl font-bold mb-3">{feat.title}</h4>
                  <p className="text-slate-400 leading-relaxed">{feat.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="harga" className="py-24 relative">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-extrabold mb-6">Investasi Sekali,<br/>Untung Berkali-kali</h2>
              <p className="text-slate-400 text-lg">Bebaskan diri Anda dari tagihan langganan bulanan software kasir.</p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto items-center">
              {/* Plan 1 */}
              <div className="glass-card rounded-[2rem] p-8 md:p-10 border border-slate-700 relative">
                <h3 className="text-2xl font-bold mb-2">Lisensi Software</h3>
                <p className="text-slate-400 mb-8">Pilihan pas untuk yang sudah punya perangkat.</p>
                <div className="mb-8 pb-8 border-b border-slate-700">
                  <div className="flex items-end gap-2">
                    <span className="text-4xl lg:text-5xl font-extrabold text-white">Rp 599k</span>
                    <span className="text-slate-400 text-lg mb-1">/selamanya</span>
                  </div>
                </div>
                <ul className="space-y-4 mb-10 text-slate-300">
                  <li className="flex items-center gap-3"><CheckCircle2 size={20} className="text-primary flex-shrink-0"/> Instalasi di 1 Perangkat</li>
                  <li className="flex items-center gap-3"><CheckCircle2 size={20} className="text-primary flex-shrink-0"/> Semua Fitur Premium POS</li>
                  <li className="flex items-center gap-3"><CheckCircle2 size={20} className="text-primary flex-shrink-0"/> Dukungan Fitur Cetak Struk</li>
                  <li className="flex items-center gap-3"><CheckCircle2 size={20} className="text-slate-600 flex-shrink-0 text-slate-500"/> <s className="text-slate-500">Hardware & Tablet</s></li>
                </ul>
                <button className="w-full py-4 rounded-xl font-bold text-center border-2 border-primary text-primary hover:bg-primary hover:text-slate-900 transition-colors">
                  Beli Lisensi Saja
                </button>
              </div>

              {/* Plan 2 - Highlight */}
              <div className="bg-gradient-to-b from-slate-800 to-slate-900 rounded-[2rem] p-8 md:p-10 border border-primary relative transform md:scale-105 shadow-[0_0_40px_rgba(40,200,180,0.15)] z-10">
                <div className="absolute -top-5 left-0 right-0 flex justify-center">
                  <span className="bg-gradient-to-r from-primary to-blue-500 text-white text-sm font-bold px-4 py-1.5 rounded-full shadow-lg">
                    🔥 Rekomendasi Terlaris
                  </span>
                </div>
                <h3 className="text-2xl font-bold mb-2 text-white">Paket Usaha Siap Jual</h3>
                <p className="text-slate-400 mb-8">Terima beres, tinggal colok dan mulai jualan.</p>
                <div className="mb-8 pb-8 border-b border-slate-700">
                  <div className="flex items-end gap-2">
                    <span className="text-4xl lg:text-5xl font-extrabold text-primary">Rp 2.499k</span>
                  </div>
                </div>
                <ul className="space-y-4 mb-10 text-slate-200">
                  <li className="flex items-center gap-3"><CheckCircle2 size={20} className="text-primary flex-shrink-0"/> <b>Aplikasi Terinstall Penuh</b></li>
                  <li className="flex items-center gap-3"><CheckCircle2 size={20} className="text-primary flex-shrink-0"/> Tablet Android 8" (Baru/Garansi)</li>
                  <li className="flex items-center gap-3"><CheckCircle2 size={20} className="text-primary flex-shrink-0"/> Printer Thermal Bluetooth 58mm</li>
                  <li className="flex items-center gap-3"><CheckCircle2 size={20} className="text-primary flex-shrink-0"/> Stand/Holder Tablet Premium</li>
                </ul>
                <button className="w-full py-4 rounded-xl font-bold text-center bg-primary text-slate-900 hover:bg-teal-400 transition-colors shadow-lg hover:shadow-primary/50">
                  Pesan Paket Lengkap
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-slate-950 py-12 border-t border-slate-800/50 mt-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded bg-primary/20 flex items-center justify-center">
                  <Coffee size={16} className="text-primary" />
                </div>
                <span className="font-bold text-xl text-white">BestariPOS</span>
              </div>
              <p className="text-slate-500 text-sm">© 2026 BestariPOS Indonesia. Dibangun untuk UMKM maju.</p>
              <div className="flex gap-6">
                <a href="#" className="text-slate-500 hover:text-primary transition font-medium">Instagram</a>
                <a href="#" className="text-slate-500 hover:text-primary transition font-medium">WhatsApp</a>
              </div>
            </div>
          </div>
        </footer>
      </main>
    </div>
  )
}
