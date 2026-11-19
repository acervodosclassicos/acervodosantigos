export default function About() {
  return (
    <div className="bg-zinc-950 min-h-screen py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        
        <div className="mb-12">
          <h1 className="font-display font-bold text-4xl text-white mb-4">Sobre a Acervo dos Antigos</h1>
          <div className="h-1 w-20 bg-orange-600"></div>
        </div>

        <div className="prose prose-invert prose-orange max-w-none text-zinc-300 leading-relaxed">
          <p className="text-xl text-zinc-200 mb-8 font-medium">
            A Acervo dos Antigos nasceu da paixão profunda por veículos que fizeram história. Não somos apenas uma loja, somos curadores do passado automotivo.
          </p>

          <h3 className="text-2xl text-white font-bold mt-12 mb-4">A Preservação da História Automotiva</h3>
          <p>
            Sabemos que restaurar um veículo clássico não é apenas consertar um carro; é resgatar memórias, preservar o design de uma era e homenagear a engenharia de outros tempos. Encontrar a peça certa, aquela com a pátina original ou o cromo de fábrica, é o que difere um simples conserto de uma verdadeira restauração.
          </p>
          <p>
            Nosso catálogo é focado em localizar, inspecionar e disponibilizar peças de veículos clássicos, antigos e de coleção que muitas vezes se perderam no tempo. Trabalhamos predominantemente com itens originais usados, estoques antigos de concessionárias (New Old Stock - NOS) e raridades meticulosamente garimpadas.
          </p>

          <h3 className="text-2xl text-white font-bold mt-12 mb-4">Nosso Compromisso</h3>
          <ul className="list-disc pl-6 space-y-2 mt-4 text-zinc-400">
            <li><strong className="text-zinc-200">Transparência Absoluta:</strong> Fotocopiamos os detalhes das peças. Se há um arranhão, ele será mostrado e descrito. Você compra exatamente o que vê.</li>
            <li><strong className="text-zinc-200">Foco no Detalhe:</strong> Cadastramos compatibilidades, códigos de fábrica e anos de aplicação para garantir que a peça sirva no seu projeto.</li>
            <li><strong className="text-zinc-200">Embalagem Segura:</strong> Peças raras exigem cuidados especiais. Embalamos cada componente como se fosse para o nosso próprio carro, garantindo que cheguem intactos à sua garagem.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
