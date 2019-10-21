import music from '../music';

export default message => {
  if (message.member) {
    const queue = music.getQueue(message.guild.id);
  } else {
    message.reply('that command is only available in servers.');
  }
};
