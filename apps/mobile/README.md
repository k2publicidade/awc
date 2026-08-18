# RIGOR Mobile — notas de campo

## Fotografias

As fotos passam por uma tela de revisão que grava no próprio JPEG uma marca d'água com data/hora, obra, responsável e localização. O arquivo é enviado como `multipart/form-data` para `/api/uploads`; somente a URL retornada é cadastrada em `/api/galeria`.

No modo offline, o JPEG é copiado para o diretório persistente do aplicativo e entra na fila de sincronização. Registros legados em data URL/base64 continuam compatíveis e são convertidos para arquivo antes do upload.

Dependências nativas compatíveis com Expo SDK 51: `expo-location`, `expo-file-system`, `react-native-view-shot` e `expo-speech-recognition@0.3.2`. Depois de atualizar dependências, gere um novo development build; o Expo Go não inclui todos esses módulos nativos.

## Configuração da API

Os perfis versionados em `eas.json` e `expo.extra.apiUrl` apontam para a API HTTPS de produção. `EXPO_PUBLIC_API_URL` continua podendo sobrescrever esse endereço por ambiente. O fallback `10.0.2.2` existe somente em desenvolvimento Android; um release sem URL configurada encerra com uma mensagem explícita em vez de tentar acessar o emulador.

## Transcrição por voz

O botão **Transcrever por voz** inicia o reconhecimento nativo em `pt-BR` após solicitar as permissões de microfone e reconhecimento de fala. A interface apresenta os estados ouvindo, processando e erro, permite interromper ou abortar a sessão e exige que o texto transcrito seja revisado antes de inseri-lo no campo de ocorrências.

A implementação usa `expo-speech-recognition@0.3.2`, tag indicada para Expo SDK 51, e seu config plugin. É necessário gerar um novo development/release build depois da instalação; não há fallback no Expo Go. Disponibilidade, reconhecimento offline e eventual processamento pelo provedor do sistema dependem do Android/iOS e das configurações do aparelho. A integração foi validada estaticamente por typecheck, não homologada em aparelho físico neste ambiente.

## Localização

A permissão é solicitada somente ao compor uma foto. Se o usuário negar ou o GPS estiver indisponível, o registro continua com a indicação visível de localização indisponível. A geocodificação reversa é complementar: as coordenadas continuam na marca d'água mesmo quando não há endereço disponível.
