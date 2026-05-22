/* ==========================================================================
   FUNÇÃO DE NOTIFICAÇÃO (Expo Push API)
   ========================================================================== */

/**
 * Envia uma notificação push via servidor do Expo.
 * @param {string} expoPushToken - O token do dispositivo que vai receber a mensagem
 * @param {string} title - Título da notificação (Ex: "Nova OP Criada!")
 * @param {string} body - Corpo do texto (Ex: "Máquina 1 - Espessura 0.5")
 * @param {object} data - Dados extras ocultos para navegar ao clicar na notificação
 */
export const sendPushNotification = async (expoPushToken, title, body, data = {}) => {
  const message = {
    to: expoPushToken,
    sound: 'default',
    title: title,
    body: body,
    data: data,
  };

  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });
    
    return await response.json();
  } catch (error) {
    console.error('Erro ao enviar notificação:', error);
    throw error;
  }
};