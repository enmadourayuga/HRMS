import React from 'react';

export default function LoginPage({
  demoUsers,
  loginEmail,
  setLoginEmail,
  loginPassword,
  setLoginPassword,
  loginLoading,
  onLogin
}) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 login-gradient text-slate-800">
      <div className="w-full max-w-4xl grid md:grid-cols-12 rounded-3xl overflow-hidden shadow-2xl border border-slate-700/50 bg-slate-900/80 backdrop-blur-xl">
        {/* Left Column: Brand & One-Click Demo Logins */}
        <div className="md:col-span-6 p-8 sm:p-10 bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 flex flex-col justify-between border-b md:border-b-0 md:border-r border-slate-800">
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
                <i className="fa-solid fa-people-roof text-2xl"></i>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">
                  Nexus<span className="text-indigo-400">HR</span>
                </h1>
                <p className="text-xs text-slate-400 font-medium">Enterprise Workforce Portal</p>
              </div>
            </div>

            {/* Demo Login Options */}
            <div className="mt-4">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                <i className="fa-solid fa-bolt text-amber-400 mr-1.5"></i> One-Click Demo Logins
              </label>
              <div className="space-y-2">
                {demoUsers.map((demo) => (
                  <button
                    key={demo.email}
                    type="button"
                    onClick={() => onLogin(null, demo.email, 'password123')}
                    className={`w-full text-left p-2.5 rounded-xl border text-xs font-medium transition-all flex items-center justify-between ${
                      demo.role === 'hr'
                        ? 'border-indigo-500/40 bg-indigo-950/40 text-indigo-200 hover:bg-indigo-900/60'
                        : 'border-slate-800 bg-slate-800/40 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <div>
                      <div className="font-semibold text-sm">{demo.label.split(' (')[0]}</div>
                      <div className="text-[11px] text-slate-400">
                        {demo.label.split(' (')[1]?.replace(')', '') || demo.role}
                      </div>
                    </div>
                    <i
                      className={`fa-solid ${
                        demo.role === 'hr' ? 'fa-user-shield text-indigo-400' : 'fa-user text-slate-500'
                      }`}
                    ></i>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-6 mt-6 border-t border-slate-800/80 text-[11px] text-slate-500 flex items-center justify-between">
            <span>NexusHR v2.0</span>
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 clock-live-dot"></span> Backend Online
            </span>
          </div>
        </div>

        {/* Right Column: Standard Corporate Sign In */}
        <div className="md:col-span-6 p-8 md:p-12 flex flex-col justify-center bg-slate-900/60">
          <div className="max-w-md mx-auto w-full">
            <div className="mb-8">
              <h3 className="text-2xl font-bold text-white mb-2">Corporate Sign In</h3>
              <p className="text-sm text-slate-400">Enter your credentials to access your account</p>
            </div>

            <form onSubmit={onLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Work Email</label>
                <div className="relative">
                  <i className="fa-solid fa-envelope absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-sm"></i>
                  <input
                    type="email"
                    value={loginEmail}
                    onChange={e => setLoginEmail(e.target.value)}
                    required
                    className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-10 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="name@company.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Password</label>
                <div className="relative">
                  <i className="fa-solid fa-lock absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-sm"></i>
                  <input
                    type="password"
                    value={loginPassword}
                    onChange={e => setLoginPassword(e.target.value)}
                    required
                    className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-10 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loginLoading}
                className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold rounded-xl text-sm shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 mt-2"
              >
                {loginLoading ? (
                  <>
                    <i className="fa-solid fa-circle-notch fa-spin"></i> Authenticating...
                  </>
                ) : (
                  <>
                    Sign In <i className="fa-solid fa-arrow-right text-xs"></i>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
