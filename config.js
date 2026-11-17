window.SITE = {
  nome: "Guardiã",

  whatsapp: {
    numero: "5532987162369", // só dígitos
    mensagem: "Olá, Nai, vim do seu site e gostaria de marcar uma conversa.",
  },

  contato: {
    email: "naiara@guardia.com",
    web3formsChave: "",
    assunto: "Novo contato pelo site Guardiã",
  },

  frames: {
    total: 160,
    desktop: "assets/frames/desktop/f_{n}.webp",
    mobile: "assets/frames/mobile/f_{n}.webp",
    // A câmera vem pela varanda (0 a 60% do vídeo) e chega no close da Nai (60% a 100%).
    // Ritmo: a varanda passa mais rápido e o close ganha quase metade da rolagem.
    ritmo: [[0, 0], [0.5, 0.62], [1, 1]],
    // No celular o vídeo deitado é cortado: a porta e a Nai ficam sempre no centro.
    focoCelular: [[0, 0.5], [1, 0.5]],
  },
};
