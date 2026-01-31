import './globals.css';
import '@rainbow-me/rainbowkit/styles.css';
import { Providers } from '../components/Providers';

export const metadata = {
  title: 'Generative NFT Launchpad',
  description: 'Mint your unique NFT',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
