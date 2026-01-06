export const metadata = {
  title: 'CN Database API',
  description: 'USDA Child Nutrition Database API',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
