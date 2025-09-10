export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm lg:flex">
        <h1 className="text-4xl font-bold">do-Mails</h1>
        <p className="text-lg">Email Alias Management System</p>
      </div>

      <div className="relative flex place-items-center">
        <h2 className="text-2xl font-semibold">
          Privacy-focused email alias management
        </h2>
      </div>

      <div className="mb-32 grid text-center lg:max-w-5xl lg:w-full lg:mb-0 lg:grid-cols-4 lg:text-left">
        <div className="group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-gray-300 hover:bg-gray-100">
          <h3 className="mb-3 text-2xl font-semibold">
            Domain Management
          </h3>
          <p className="m-0 max-w-[30ch] text-sm opacity-50">
            Add and verify your custom domains for email alias creation.
          </p>
        </div>

        <div className="group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-gray-300 hover:bg-gray-100">
          <h3 className="mb-3 text-2xl font-semibold">
            Email Aliases
          </h3>
          <p className="m-0 max-w-[30ch] text-sm opacity-50">
            Create unlimited email aliases under your verified domains.
          </p>
        </div>

        <div className="group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-gray-300 hover:bg-gray-100">
          <h3 className="mb-3 text-2xl font-semibold">
            Unified Inbox
          </h3>
          <p className="m-0 max-w-[30ch] text-sm opacity-50">
            Manage all your emails in a single, Gmail-like interface.
          </p>
        </div>

        <div className="group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-gray-300 hover:bg-gray-100">
          <h3 className="mb-3 text-2xl font-semibold">
            Privacy First
          </h3>
          <p className="m-0 max-w-[30ch] text-sm opacity-50">
            Reply from alias addresses to maintain your privacy.
          </p>
        </div>
      </div>
    </main>
  )
}
