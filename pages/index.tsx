import Converter from '../components/Converter';

export default function Home() {
  return (
      <div className=" flex items-center justify-center mx-4 my-4 flex-col">
          <p className="text-3xl font-bold mb-4">Solana Anchor Struct Converter</p>
        <Converter />
        <p className="text-sm mt-4">Made with ❤️ by <a className="text-blue-500" href="https://twitter.com/ace3">@ace3</a></p>
      </div>
  );
}
