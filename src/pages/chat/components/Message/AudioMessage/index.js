import React, { Component } from 'react';
import cx from 'classnames';
import './index.less';
import * as socket from '../../../utils/socket';
import Constant from '../../../utils/constant';

export default class AudioMessage extends Component {
  constructor(props) {
    super(props);
    const { message } = this.props;
    const { files } = message.msg;
    this.state = {
      audioPlaying: false,
      isRead: files.read,
    };
    this.audio = null;
  }
  handlePlayAudio() {
    const { message } = this.props;
    const { files } = message.msg;

    if (!files.read) {
      socket.Message.markAudioAsRead({
        messageId: message.id,
      });
      this.setState({
        isRead: true,
      });
    }

    require(['../../../lib/mp3player/mp3player'], (player) => {
      // 第一次播放
      if (!this.audio) {
        this.setState({
          audioPlaying: true,
        });
        this.audio = new player({
          mp3_url: files.url + '?avthumb/mp3',
          wav_url: files.url + '?avthumb/wav',
          onStop: () => {
            this.setState({
              audioPlaying: false,
            });
          },
        });
        window.chatAudioPlayer = this.audio;
        window.chatAudioPlayer.play();
      } else if (this.state.audioPlaying) {
        // 取消播放
        this.audio.stop();
        window.chatAudioPlayer.stop();
      } else {
        // 重播
        window.chatAudioPlayer = this.audio;
        window.chatAudioPlayer.play();
        this.setState({
          audioPlaying: true,
        });
      }
    });
  }
  render() {
    const { message } = this.props;
    const { files } = message.msg;
    const { audioPlaying, isRead } = this.state;
    // console.log('message', message);
    return (
      <div className="Message-audio" onClick={this.handlePlayAudio.bind(this)}>
        <i className={cx('Message-audioIcon', { audioPlaying })} />
        <span>{parseInt(files.len) || 0} ”</span>
        {isRead ? undefined : <div className="Message-audioUnread" />}
      </div>
    );
  }
}
