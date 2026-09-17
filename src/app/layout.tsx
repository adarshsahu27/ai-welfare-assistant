import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Welfare Support",
  description: "Student welfare assistant",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <style>{`
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
            background: #f5f5f5;
            color: #333;
          }
          
          input, button, select {
            font-family: inherit;
          }
          
          button {
            cursor: pointer;
          }
        `}</style>
      </head>
      <body>{children}</body>
    </html>
  );
}