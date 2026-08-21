interface PublicFooterProps {
  business: {
    name: string
  }
}

export function PublicFooter({ business }: PublicFooterProps) {
  const year = new Date().getFullYear()

  return (
    <footer className="border-t border-border mt-auto pb-16 md:pb-0">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <p className="text-center text-xs text-muted-foreground font-medium">
          © {year} {business.name} · Todos los derechos reservados
        </p>
      </div>
    </footer>
  )
}