import React, { Component } from 'react';
import cx from 'classnames';
import { Flex, Toast } from 'antd-mobile';
import { Icon, Progress } from 'ming-ui';
import { getToken2, getRandStr, getHashCode } from 'src/components/UploadFiles/utils';
import './index.less';
import { getRandomString, convertImageView, getClassNameByExt } from 'src/util';

const formatResponseData = (file, response) => {
  const item = {};
  const data = JSON.parse(response);
  item.fileID = file.id;
  item.fileSize = file.size || 0;
  item.serverName = data.serverName;
  item.filePath = data.filePath;
  item.fileName = data.fileName;
  item.fileExt = data.fileExt;
  // item.ext = data.fileExt;
  item.originalFileName = data.originalFileName;
  item.key = data.key;
  item.oldOriginalFileName = item.originalFileName;
  if (!File.isPicture(item.fileExt)) {
    item.allowDown = true;
    item.docVersionID = '';
  }
  return item;
};

export class UploadFileWrapper extends Component {
  constructor(props) {
    super(props);
    this.state = {
      files: props.files,
    };
    this.currentFile = null;
    this.id = `uploadFiles-${getRandomString()}`;
  }
  componentDidMount() {
    getToken2({
      isPublic: /.*\/form\/\w{32}/.test(location.pathname) || /.*\/recordshare\/\w{24}/.test(location.pathname),
    }).then(result => {
      this.uploadFile(result);
    });
  }
  componentWillReceiveProps(nextProps) {
    if (nextProps.files.length !== this.props.files.length) {
      this.setState({
        files: nextProps.files,
      });
    }
  }
  uploadFile({ doc, pic }) {
    const self = this;
    const method = {
      FilesAdded(uploader, files) {
        if (parseFloat(files.reduce((total, file) => total + (file.size || 0), 0) / 1024 / 1024) > md.global.SysSettings.fileUploadLimitSize) {
          Toast.info('附件总大小超过 ' + utils.formatFileSize(md.global.SysSettings.fileUploadLimitSize * 1024 * 1024) + '，请您分批次上传');
          uploader.stop();
          uploader.splice(uploader.files.length - files.length, uploader.files.length);
          return false;
        }

        self.uploading = true;
        files
          .filter(item => item.name || item.type)
          .forEach(item => {
            const { files: fileList } = self.state;
            const fileExt = `.${File.GetExt(item.name)}`;
            const fileName = File.GetName(item.name);
            const isPic = File.isPicture(fileExt);
            const id = item.id;
            const base = {
              isPic,
              fileExt,
              fileName,
              id,
            };
            const newFiles = fileList.concat({ id: item.id, progress: 0, base });
            self.setState({
              files: newFiles,
            });
            self.props.onChange(newFiles);
          });
        uploader.start();
      },
      BeforeUpload(uploader, file) {
        self.currentFile = uploader;
        const fileExt = `.${File.GetExt(file.name)}`;
        const isPic = File.isPicture(fileExt);
        const { token, serverName } = isPic ? pic : doc;
        const date = new Date();
        const filePathArr = [];
        const newFilename = getRandStr(15) + '_' + Math.abs(getHashCode(file.name) + getHashCode(date));
        uploader.settings.multipart_params = {
          token,
        };
        filePathArr.push((isPic ? 'pic' : 'doc') + '/');
        filePathArr.push(moment(date).format('YYYYMM') + '/');
        filePathArr.push(isPic ? moment(date).format('DD') + '/' : '');
        const filePath = filePathArr.join('');
        uploader.settings.multipart_params.key = filePath + newFilename + fileExt;
        uploader.settings.multipart_params['x:serverName'] = serverName;
        uploader.settings.multipart_params['x:filePath'] = filePath;
        uploader.settings.multipart_params['x:fileName'] = newFilename;
        uploader.settings.multipart_params['x:originalFileName'] = encodeURIComponent(
          file.name.indexOf('.') > -1 ? file.name.split('.').slice(0, -1).join('.') : file.name,
        );
        uploader.settings.multipart_params['x:fileExt'] = fileExt;
      },
      UploadProgress(uploader, file) {
        const uploadPercent = ((file.loaded / file.size) * 100).toFixed(1);
        // 给当前正在上传的文件设置进度
        const newFiles = self.state.files.map(item => {
          if (file.id === item.id && 'progress' in item) {
            item.progress = uploadPercent;
          }
          return item;
        });
        self.setState({
          files: newFiles,
        });
        self.props.onChange(newFiles);
      },
      FileUploaded(uploader, file, response) {
        // 上传完成，取消进度条
        const newFiles = self.state.files.map(item => {
          if (file.id === item.id && 'progress' in item) {
            item = formatResponseData(file, decodeURIComponent(response.response));
            delete item.progress;
            delete item.base;
          }
          return item;
        });
        self.setState({
          files: newFiles,
        });
        self.props.onChange(newFiles, true);
      },
      UploadComplete() {
        self.uploading = false;
      },
      Error(uploader, error) {
        if (error.code == -600) {
          Toast.info('附件总大小超过 ' + utils.formatFileSize(md.global.SysSettings.fileUploadLimitSize * 1024 * 1024) + '，请您分批次上传');
        }
      },
    };
    $(this.uploadFileEl).plupload({
      url: md.global.FileStoreConfig.uploadHost,
      file_data_name: 'file',
      multi_selection: true,
      method,
    });
  }
  render() {
    const { children, className } = this.props;
    return (
      <div className="Relative">
        <span ref={el => (this.uploadFileEl = el)} id={this.id} className={className}>
          {children}
        </span>
      </div>
    );
  }
}

export default class AttachmentList extends Component {
  static defaultProps = {
    width: 120,
  };
  style: null;
  constructor(props) {
    super(props);
    this.style = { width: props.width };
  }
  handleRemove(item, event) {
    event.stopPropagation();
    const { fileID } = item;
    const { attachments } = this.props;
    const newFiles = attachments.filter(item => item.fileID !== fileID);
    this.props.onChange(newFiles, true);
  }
  previewAttachment(index) {
    const { attachments } = this.props;
    const { updateTime } = attachments[index];
    require(['previewAttachments'], previewAttachments => {
      previewAttachments({
        index: index || 0,
        attachments: updateTime
          ? attachments
          : attachments.map(item => {
              return {
                name: `${item.originalFileName || _l('未命名')}${item.fileExt}`,
                path: `${item.serverName}${item.key}`,
                previewAttachmentType: 'QINIU',
                size: item.fileSize,
                fileid: item.fileID,
              };
            }),
        callFrom: updateTime ? 'player' : 'chat',
        showThumbnail: true,
        hideFunctions: ['editFileName'],
      });
    });
  }
  renderImage(item, index) {
    const isKc = item.refId ? true : false;
    const url = isKc
      ? `${item.middlePath + item.middleName}`
      : convertImageView(
          `${item.previewUrl || `${item.serverName}${item.key}?imageMogr2/auto-orient`}`,
          1,
          200,
          140,
        );
    return (
      <Flex
        key={item.fileID}
        className="fileWrapper"
        style={this.style}
        onClick={e => {
          this.previewAttachment(index);
          e.stopPropagation();
        }}
      >
        <div className="image" style={{ backgroundImage: `url(${url})` }}></div>
        {this.props.isRemove ? (
          <Icon icon="close" className="closeIcon" onClick={this.handleRemove.bind(this, item)} />
        ) : null}
      </Flex>
    );
  }
  renderFile(item, index) {
    const fileExt = getClassNameByExt((item.fileExt || item.ext).replace('.', ''));
    return (
      <Flex
        key={item.fileID}
        direction="column"
        className="fileWrapper"
        style={this.style}
        onClick={e => {
          this.previewAttachment(index);
          e.stopPropagation();
        }}
      >
        <Flex className="filePanel" justify="center" align="center">
          <div className={cx(fileExt, 'fileIcon')}></div>
        </Flex>
        <Flex className="fileText">
          <span>{`${item.originalFileName || item.originalFilename}${item.fileExt || item.ext}`}</span>
        </Flex>
        {this.props.isRemove ? (
          <Icon icon="close" className="closeIcon" onClick={this.handleRemove.bind(this, item)} />
        ) : null}
      </Flex>
    );
  }
  renderProgress(item) {
    const { progress, base } = item;
    return (
      <Flex key={item.id} direction="column" className="fileWrapper" style={this.style}>
        <Flex className="filePanel" justify="center" align="center">
          <Progress.Circle
            key="text"
            isAnimation={false}
            isRound={false}
            strokeWidth={3}
            diameter={47}
            foregroundColor="#BDBDBD"
            backgroundColor="#fff"
            format={percent => ''}
            percent={parseInt(progress)}
          />
        </Flex>
        <Flex className="fileText">
          <span>{`${base.fileName}${base.fileExt || item.ext}`}</span>
        </Flex>
      </Flex>
    );
  }
  render() {
    const { attachments } = this.props;
    const emptys = Array.from({ length: 6 });
    return (
      <Flex className="attachmentFiles">
        {attachments.map((item, index) =>
          'progress' in item
            ? this.renderProgress(item)
            : File.isPicture(item.fileExt || item.ext)
            ? this.renderImage(item, index)
            : this.renderFile(item, index),
        )}
        {emptys.map((item, index) => (
          <div key={index} className="fileWrapper fileEmpty"></div>
        ))}
      </Flex>
    );
  }
}
