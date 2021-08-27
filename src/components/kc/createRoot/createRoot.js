﻿/**
 * @module createRoot
 * @author stone
 * @desc 创建或编辑共享文件夹
 * @example
 * require.async('src/components/kc/createRoot/creatRoot.js', (creatRoot) =>{
 *   creatRoot({
 *         isEdit: false,
 *         id: '',
 *         isStared: false,
 *         name: '',
 *         members:[],
 *       }).then(function (result) {
 *          //result ={}
 *          //doSomething
 *       });
 * });
 */
import 'nanoScroller';

import '../layerMain.css';
import './createRoot.css';

var mdDialog = require('mdDialog'),
  mdFunction = require('mdFunction'),
  doT = require('dot'),
  kcAjax = require('src/api/kc'),
  htmlTpl = require('./tpl/createRoot.html');
var PERMISSION_TYPE = {
  NONE: -1,
  ALL: 0,
  OWNER: 1, // 拥有者
  ADMIN: 2, // 管理员
  NORMAL: 3, // 可编辑（原普通成员）
  READONLY: 4, // 只读
};
var PERMISSION_TYPE_NAME = {
  1: '拥有者',
  2: '管理员',
  3: '可编辑',
  4: '只读',
};
var MEMBER_STATUS = {
  NORMAL: 1,   // 正常状态
  INACTIVE: 2, // 未审核
};
var ACCOUNT_STATUS = {
  NORMAL: 1,   /// 正常状态
  LOGOFF: 2,   /// 注销状态
  INACTIVE: 3, /// 未激活的
};

function RootSettings(settings) {
  var defaults = {
    isEdit: false,
    id: '',
    isStared: false,
    name: '',
    members: [],
  };
  this.settings = $.extend(defaults, settings);
  this.init();
}
$.extend(RootSettings.prototype, {
  init: function () {
    var _this = this,
      rootSettingsDf = _this.settings.deferred,
      isEdit = _this.settings.isEdit,
      rootId = _this.settings.id,
      originalName = _this.settings.name;
    var rootPromise;
    if (isEdit) {
      rootPromise = kcAjax.getRootDetail({id: rootId});
    } else {
      rootPromise = $.when({
        members: this.settings.members,
        isStared: this.settings.isStared,
        name: this.settings.name,
        project: null,
        permission: 1,
      });
    }
    rootPromise.then(function (root) {
      if (!root) {
        alert('共享文件夹不存在或已被删除', 3);
        return rootSettingsDf.reject();
      }

      // 成员排序 ：  待审核、拥有者、管理员、可编辑、只读
      root.members.sort(function (a, b) {
        return a.permission - b.permission;
      });
      // 把待审核提前
      root.members = root.members.filter(m => m.memberStatus === 2).concat(root.members.filter(m => m.memberStatus !== 2));

      // 默认创建的的网络
      var defaultProject = null;
      if (!isEdit) {
        if (_this.settings.projectId && _.find(md.global.Account.projects, p => p.projectId === _this.settings.projectId)) {
          var project = _.find(md.global.Account.projects, p => p.projectId === _this.settings.projectId);
          defaultProject = {
            projectId: project.projectId,
            companyName: project.companyName,
          };
        } else if (md.global.Account.projects.length == 1 && md.global.Account.projects[0].licenseType !== 0) {
          defaultProject = {
            projectId: md.global.Account.projects[0].projectId,
            companyName: md.global.Account.projects[0].companyName,
          };
        } else if (window.localStorage.getItem('createRoot.projectId')) {
          var usedProjectId = window.localStorage.getItem('createRoot.projectId');
          var usedProject = md.global.Account.projects.filter(function (project) {
            return project.projectId === usedProjectId && project.licenseType !== 0;
          });
          if (usedProject && usedProject.length) {
            defaultProject = usedProject[0];
          }
        }
      }
      _this.settings.dialog = mdDialog.index({
        dialogBoxID: 'createFolderBox',
        className: 'kcDialogBox',
        width: 520,
        container: {
          header: isEdit ? _l('编辑文件夹') : _l('创建文件夹'),
          content: doT.template(htmlTpl)($.extend({}, root, defaultProject ? {project: defaultProject} : null)),
          yesText: isEdit ? '' : _l('创建'),
          noText: isEdit ? '' : _l('取消'),
          yesFn: function () {
            var $createFolderBox = $('#createFolderBox'),
              $txtFolderName = $createFolderBox.find('.txtFolderName'),
              name = $txtFolderName.val().trim();
            if (!isEdit) {
              if (!_this.verifyName(name, root.name)) {
                return false;
              }

              var members = [], inviteMembers = [];
              $createFolderBox.find('.folderMemberBox .memberItem').toArray().forEach(function (el) {
                var $el = $(el);
                var accountId = $el.data('accountId');
                if (accountId) {
                  members.push({
                    accountId: accountId,
                    permission: $el.find('.permission').data('permission') || PERMISSION_TYPE.NORMAL,
                    status: MEMBER_STATUS.NORMAL,
                    inviterAccountId: md.global.Account.accountId,
                  });
                } else {
                  inviteMembers.push({
                    account: $el.data('account'),
                    fullname: $.trim($el.find('.memberName .added').html()),
                    permission: $el.find('.permission').data('permission') || PERMISSION_TYPE.NORMAL,
                  });
                }
              });

              var star = $createFolderBox.find(".addFolderStar").hasClass("icon-task-star"),
                projectId = $createFolderBox.find('.dropBox .seleted').data('projectId');
              kcAjax.addRoot({
                name: name,
                projectId: projectId,
                members: members,
                star: star,
                invitedMembers: inviteMembers,
                appId: _this.settings.appId,
              }).then(function (res) {
                if (res) {
                  if (projectId) {
                    window.localStorage.setItem('createRoot.projectId', projectId);
                  }
                  rootSettingsDf.resolve(res);
                }
                else {
                  rootSettingsDf.reject();
                }
              }).fail(rootSettingsDf.reject);
            }
          },
        },
        readyFn: function () {
          var $createFolderBox = $('#createFolderBox'),
            $folderMemberBox = $createFolderBox.find('.folderMembers .folderMemberBox'),
            $updatePermission = $('#updatePermission'),
            myPermis = root.permission;
          $createFolderBox.find('.folderName .txtFolderName').val(root.name);
          _this.nanoScroller();
          _this.bindInitEvent(root);

          //创建root时 不允许托付文件夹
          if (!isEdit) {
            $folderMemberBox.find('.memberItem .rootTrust').remove();
          }
          if (_this.settings.projectId) {
            $createFolderBox
              .find('.attribute .dropBox').css('border', 0)
              .end()
              .find('.attribute .dropBox span.icon').remove()
              .end()
              .find('.attribute .dropBox .seleted').css({
              'border-right': 0,
              'width': '316px',
            });
          }
          if (isEdit) {
            $folderMemberBox.css('margin-bottom', '46px')
              .find('.permissionDesc').css('margin-top', '14px');
            $createFolderBox
              .find('.attribute .dropBox').css('border', 0)
              .end()
              .find('.attribute .dropBox span.icon').remove()
              .end()
              .find('.attribute .dropBox .seleted').css({
              'border-right': 0,
              'width': '316px',
            });
          }
          $folderMemberBox.find('.permissionDesc').show();
          $createFolderBox.find('.txtFolderName').on('keydown', function (evt) {
            if (evt.which === 13) {
              $createFolderBox.find('.footer .yesText').click();
            }
          }).select().focus();
          if (myPermis === PERMISSION_TYPE.READONLY) {
            $folderMemberBox.find('.addUser').hide();
          }
          $('body').on('click', function () {
            $updatePermission.fadeOut();
            $('#checkInviter').fadeOut();
            $('#folderAttributeList').fadeOut();
          });
        }
      });
    });
  },
  bindInitEvent: function (root) {
    var _this = this,
      isEdit = _this.settings.isEdit,
      rootId = _this.settings.id;
    var $createFolderBox = $('#createFolderBox'),
      $folderMemberBox = $createFolderBox.find('.folderMembers .folderMemberBox'),
      $updatePermission = $('#updatePermission'),
      $checkInviter = $('#checkInviter'),
      myPermis = root.permission;
    //添加为成员
    $folderMemberBox.find('.addMember').off().on('click', 'span.addFriends', function () {
      var $this = $(this);
      var selectProjectId = isEdit ? root.project && root.project.projectId
        : $createFolderBox.find('.attribute .dropBox .seleted').data('projectId');
      require(["quickSelectUser"], function () {
        $this.quickSelectUser({
          //title: _l('请选择同事'),
          sourceId: isEdit ? rootId : '',
          fromType: 'KC',
          showMoreInvite: true,
          projectId: root.project && root.project.projectId || '',
          zIndex: 10001,
          selectCb: function (users) {
            _this.addRootMemers(users, root);
          },
          SelectUserSettings: {
            projectId: selectProjectId || '',
            filterAccountIds: root.members.filter(function (m) {
              return m.accountId;
            }).map(function (member) {
              return member.accountId || '';
            }),
            callback: function (users) {
              _this.addRootMemers(users, root);
            }
          },
          ChooseInviteSettings: {
            callback: function (users, callbackInviteResult) {
              _this.addRootMemers(users, root, true, callbackInviteResult);
            }
          }
        });
      });
    });

    // 更改权限的事件绑定
    $createFolderBox.find('.folderMemberBox  ul').on({
      click: function (event) {
        event.stopPropagation();

        if (root.permission !== PERMISSION_TYPE.ADMIN && root.permission !== PERMISSION_TYPE.OWNER) {
          return;
        }

        var $this = $(this);
        var height = $this.height();
        var offset = $this.offset();
        var windowHeight = $createFolderBox.offset().top + $createFolderBox.height();
        var $memberItem = $this.closest('li.memberItem');
        var $permission = $this.closest('.permission');
        var accountId = $memberItem.data('accountId');
        var accountStatus = $permission.find('.pointer i').data('accountStatus');
        var memberStatus = $permission.find('.pointer i').data('memberStatus');
        var apkName = $permission.data('apkname');
        var memberPermis = $permission.data('permission');
        if (memberPermis === PERMISSION_TYPE.OWNER || apkName) {
          return;
        }
        if (memberStatus !== 2) {
          $updatePermission.find('.itemLi .selectStatus').hide();
          $updatePermission.find('.itemLi .itemText').removeClass('ThemeColor3');
          if (memberPermis == PERMISSION_TYPE.ADMIN) {
            $updatePermission.find('.adminItem .selectStatus').show();
            $updatePermission.find('.adminItem .itemText').addClass('ThemeColor3');
          } else if (memberPermis == PERMISSION_TYPE.NORMAL) {
            $updatePermission.find('.ordinaryItem .selectStatus').show();
            $updatePermission.find('.ordinaryItem .itemText').addClass('ThemeColor3');
          } if (memberPermis == PERMISSION_TYPE.READONLY) {
            $updatePermission.find('.readOnlyItem .selectStatus').show();
            $updatePermission.find('.readOnlyItem .itemText').addClass('ThemeColor3');
          }
          $checkInviter.fadeOut();
          $updatePermission.css({
            top: offset.top + height + $updatePermission.height() > windowHeight ? offset.top - $updatePermission.height() : offset.top + height,
            left: offset.left - 52,
          }).data(accountId ? 'accountId' : 'account', accountId || $memberItem.data('account')).show();
        } else {
          $updatePermission.fadeOut();
          $checkInviter.css({
            top: offset.top + 30 + $checkInviter.height() > windowHeight ? offset.top - $checkInviter.height() : offset.top + height,
            left: offset.left - 25,
          }).data(accountId ? 'accountId' : 'account', accountId || $memberItem.data('account')).show();
        }
      },
      mouseover: function () {
        var $this = $(this),
          isApproved = $this.find('i.icon-approved').length;
        if (root.permission == PERMISSION_TYPE.ADMIN || root.permission == PERMISSION_TYPE.OWNER && !isApproved) {
          $this.addClass('ThemeColor3');
        }
      },
      mouseout: function () {
        $(this).removeClass('ThemeColor3');
      }
    }, '.memberItem .permission .pointer');

    // 权限修改项事件
    $updatePermission.off().on({
      mouseover: function () {
        if (!$(this).find('.itemText').hasClass('ThemeColor3')) {
          $(this).addClass('ThemeBGColor3');
        }
      },
      mouseout: function () {
        $(this).removeClass('ThemeBGColor3');
      },
      click: function () {
        var $this = $(this);
        var changePermision = parseInt($this.data('value'));
        var accountId = $this.closest('ul').data('accountId');

        if ($this.find('.itemText').hasClass('ThemeColor3')) {
          return;
        }
        if (!isEdit) {
          //是否是未注册用户
          var accountStr = accountId ? accountId : $this.closest('ul').data('account');
          var $changedMemberLi = accountId
            ? $('.folderMemberBox .memberItem[data-account-id="' + accountStr + '"]')
            : $('.folderMemberBox .memberItem[data-account="' + accountStr + '"]');
          //var $memberItem = $changedPermission.closest('li.memberItem');
          //memberData.permission = changePermision;
          //$memberItem.data('member', memberData);

          $changedMemberLi
            .find('.permission').data('permission', changePermision)
            .find('.text').html(PERMISSION_TYPE_NAME[changePermision]);
        } else {
          kcAjax.updateMemberPermission({
            id: root.id,
            memberId: accountId,
            permission: changePermision,
          }).then(function (result) {
            if (!result) {
              return $.Deferred().reject();
            }
            alert("操作成功");
            var $changedMember = $('.folderMemberBox .memberItem[data-account-id="' + accountId + '"]');
            $changedMember
              .find('.permission').data('permission', changePermision)
              .find('.text').html(PERMISSION_TYPE_NAME[changePermision]);
            if(changePermision === PERMISSION_TYPE.ADMIN) {
              $changedMember.find('.remove').remove();
            } else {
              $changedMember.find('.remove').remove().end().append($('<span class="remove" style="display: none;">移除</span>'));
            }
            if (accountId === md.global.Account.accountId) {
              _this.settings.deferred.notify($.extend({}, root, {
                permission: changePermision,
              }));
              _this.settings.dialog.closeDialog();
            }
          }).fail(function () {
            alert('操作失败，请稍后重试!', 3);
          });
        }
      }
    }, '.itemLi').on({
      click: function (evt) {
        evt.stopPropagation();
      }
    }, '.itemLi .icon-task-folder-message');

    //审批邀请账户
    $checkInviter.find('li').on('click', function () {
      var $this = $(this);
      var memberId = $this.closest('#checkInviter').data('accountId');
      var $checkMemberLi = $folderMemberBox.find('li.memberItem[data-account-id="' + memberId + '"]');
      if ($this.hasClass('pass')) {
        kcAjax.updateMemberStatus({
          id: root.id,
          memberId: memberId,
          memberStatus: MEMBER_STATUS.NORMAL
        }).then(function (result) {
          if (!result) {
            return $.Deferred().reject();
          }
          alert('操作成功');
          $checkMemberLi
            .find('.memberName .added').removeClass('addedMax')
            .end()
            .find('.memberName .inviter')
            .remove()
            .end()
            .find('.permission .pointer')
            .find('.text').html('可编辑')
            .end()
            .find('i').data('memberStatus', MEMBER_STATUS.NORMAL);
        }).fail(function () {
          alert('操作失败，请稍后重试!', 3);
        });
      } else {
        mdDialog.index({
          zIndex: 1009,
          container: {
            header: _l('操作提示'),
            content: '<div class="Font14">拒绝后将移除该用户</div>',
            yesFn: function () {
              kcAjax.removeRootMember({ id: rootId, memberId: memberId }).then(function (data) {
                if (data && data.result) {
                  $checkMemberLi.slideUp(function () {
                    $(this).remove();
                    _this.nanoScroller();
                  });
                  var newMembers = root.members.filter(function (m) {
                    return m.accountId !== memberId.toLowerCase();
                  });
                  _this.settings.deferred.notify($.extend({}, root, {
                    members: newMembers,
                  }));
                } else {
                  return $.Deferred().reject(data.message);
                }
              }).fail(function (err) {
                alert(err || _l('操作失败, 请稍后重试'), 3);
              });
            },
            noFn: function () {
            },
          },
        });
      }
    });

    //标星
    $createFolderBox.on("click", '.addFolderStar', function () {
      var $this = $(this),
        star = $this.hasClass("icon-task-star") ? false : true;
      if (isEdit) {
        kcAjax.starRoot({id: root.id, star: star}).then(function (res) {
          if (!res) {
            return $.Deferred().reject();
          }
          alert('操作成功');
          $this.removeClass('icon-task-star icon-star-hollow').addClass(star ? 'icon-task-star' : 'icon-star-hollow');
          var newRoot = $.extend({}, root, {isStared: star},
            root.isStared == star ? null : {
              staredTime: star ? new Date().toISOString() : null,
            });
          _this.settings.deferred.notify(newRoot);
        }).fail(function () {
          alert('操作失败,请稍后重试', 3);
        });
      } else {
        $this.removeClass('icon-task-star icon-star-hollow').addClass(star ? 'icon-task-star' : 'icon-star-hollow');
      }
    }).on('click', function () {
      $updatePermission.hide();
    });
    //更改名称
    if (isEdit) {
      $createFolderBox.find('.folderName .txtFolderName').on({
        blur: function () {
          var $this = $(this),
            name = $.trim($this.val());
          if (name == root.name) {
            return;
          }
          if (!_this.verifyName(name, root.name)) {
            setTimeout(function () {
              $this.select()
            }, 300);
            return;
          }

          kcAjax.updateRootName({id: root.id, name: name}).then(function (result) {
            if (!result) {
              return $.Deferred().reject();
            }

            alert("操作成功");
            _this.settings.name = root.name = name;
            _this.settings.deferred.notify($.extend({}, root, {
              name: name,
            }));
          }).fail(function () {
            alert("操作失败，请稍后重试", 3);
          });
        },
        keydown: function (evt) {
          if (evt.keyCode == 13) {
            $(this).blur();
          }
        }
      });
    }

    //所属网络下拉框
    var $attributeList = $('#folderAttributeList');
    if (!_this.settings.isEdit && !_this.settings.projectId) {
      $createFolderBox.find('.folderContent .dropBox').on({
        click: function (evt) {
          if ($('.addFriends').data('md.quickSelectUser')) {
            $('.addFriends').data('md.quickSelectUser').closePane();
          }
          evt.stopPropagation();
          if (!$attributeList.is(':visible')) {
            var $this = $(this),
              tplHtml = doT.template('<li class="projectItem ellipsis" data-project-id="{{= it.projectId}}">{{! it.companyName}}</li>'),
              currentProjectId = $this.find('.seleted').data('projectId'),
              itemList = '',
              friendsShare = currentProjectId ? tplHtml({projectId: '', companyName: _l('个人')}) : '';

            md.global.Account.projects.forEach(function (pjt) {
              if (pjt.projectId != currentProjectId) {
                itemList += tplHtml(pjt);
              }
            });
            if (!itemList) {
              itemList += '<li class="noProject ellipsis">未加入其他网络</li>'
            }
            itemList += friendsShare;
            $attributeList.html(itemList).fadeIn();
          } else {
            $attributeList.fadeOut();
          }
        }
      });
      $attributeList.on('click', '.projectItem', function () {
        var $this = $(this),
          selectId = $this.data('projectId'),
          selectName = $this.html().trim();
        //判断付费版是否到期
        mdFunction.expireDialogAsync(selectId).then(function () {
          $createFolderBox.find('.folderContent .dropBox .seleted').html(selectName).data('projectId', selectId);
          $attributeList.fadeOut();
          var membersLi = $createFolderBox.find('.folderMembers .memberList .memberItem').filter(function (index) {
            return ($(this).data('accountId') || $(this).data('account')) !== md.global.Account.accountId;
          });

          if (membersLi.length) {
            mdDialog.index({
              container: {
                header: '归属变更',
                content: '<div class="Font14">您变更了文件夹的归属,要清空成员列表吗?</div>',
                yesText: '清空成员',
                yesFn: function () {
                  membersLi.slideUp(function () {
                    $(this).remove();
                    _this.nanoScroller();
                  });
                },
                noText: '保留',
                noFn: function () {
                }
              },
              zIndex: 1003,
            });
          }
        }).fail(function () {
          return false;
        });

      });
    } else {
      $createFolderBox.find('.folderContent .dropBox').css('color', '#7d7d7d')
    }

    //成员名片层
    require(['mdBusinessCard'], function () {

      $createFolderBox.find('.folderMemberBox  ul').on({

        mouseover: function () {
          var $this = $(this);
          var aid = $this.data('account-id');
          var account = _.find(root.members, m => m.accountId === aid);
          if ($this.data("bindCard") || $this.data('accountId') == 'undefined') {
            return;
          }
          $this.mdBusinessCard({
            secretType: 1,
            opHtml: account && account.roleName ? `<div class="Gray_9e w100 WhiteBG pLeft10 pRight10 ellipsis" title="${root.apkName}" style="border-top: 1px solid #ddd;border-radius: 0 0 4px 4px;">
            ${_l('来自应用包：%0', root.apkName)}
          </div>` : '',
          });
          $this.data("bindCard", true);
          $this.mouseenter();
        }
      }, '.memberItem .imgMemberBox, .memberItem .inviter .name');

    });

    //hover 移除成员
    $createFolderBox.find('.folderMemberBox  ul').on({
      mouseover: function () {
        if (!$(this).find(".remove").hasClass('exit')) {
          $(this).find(".toInvite, .remove").show();
        }
      }, mouseout: function () {
        if (!$(this).find(".remove").hasClass('exit')) {
          $(this).find(".toInvite, .remove").hide();
        }
      }
    }, '.memberItem').on("click", ".memberItem .remove", function () {
      var $this = $(this),
        isExit = $this.hasClass('exit'),
        removeMemberId = $this.closest('.memberItem').data('accountId'),
        conFirmStr = isExit ? "是否确定退出该共享文件夹?" : _l('是否确定移除该成员');

      if (isEdit) {
        mdDialog.index({
          container: {
            header: _l('操作提示'),
            content: '<div class="Font14">' + conFirmStr + '</div>',
            yesFn: function () {
              kcAjax.removeRootMember({id: rootId, memberID: removeMemberId}).then(function (data) {
                if (data && data.result) {
                  // 成员自己退出root
                  var newMembers = root.members.filter(function (m) {
                    return m.accountId !== removeMemberId.toLowerCase();
                  });
                  if (isExit) {
                    _this.settings.deferred.resolve(null);
                    _this.settings.dialog.closeDialog();
                  } else {
                    $this.closest('.memberItem').slideUp(function () {
                      _this.nanoScroller();
                      $(this).remove();
                    });

                    _this.settings.deferred.notify($.extend({}, root, {
                      members: newMembers,
                    }));
                  }
                } else {
                  return $.Deferred().reject(data.message);
                }
              }).fail(function (err) {
                alert(err || _l('操作失败, 请稍后重试'), 3);
              });

            },
            noFn: function () {
            }
          },
          zIndex: 1003
        });
      } else {
        $this.closest('.memberItem').slideUp(function () {
          _this.nanoScroller();
          $(this).remove();
        });
      }

    }).on('click', '.memberItem .rootTrust', function () {
      var $this = $(this);
      require(["dialogSelectUser"], function () {
        $(this).dialogSelectUser({
          title: _l('请选择同事'),
          showMoreInvite: false,
          SelectUserSettings: {
            unique: true,
            projectId: root.project && root.project.projectId || '',
            filterAccountIds: [md.global.Account.accountId],
            callback: function (users) {
              if (!users && users.length <= 0) {
                alert('请选择托付用户', 2);
                return;
              }
              var newOwner = users[0];
              kcAjax.updateRootOwner({ id: root.id, memberId: newOwner.accountId }).then(function (result) {
                if (!result) {
                  return $.Deferred().reject();
                }
                alert('托付成功');
                var members = root.members.slice(0);
                function getNewOwnerObject() {
                  var ownerInMembers = _.find(members, m => newOwner.account === m.accountId);
                  var newOwnerObject = ownerInMembers ? _.assign({}, ownerInMembers, {
                    permission: PERMISSION_TYPE.OWNER,
                  }) : _.assign({}, newOwner, {
                    accountStatus: ACCOUNT_STATUS.NORMAL,
                    memberStatus: MEMBER_STATUS.NORMAL,
                    permission: PERMISSION_TYPE.OWNER,
                    inviterAccountId: md.global.Account.accountId,
                    inviterFullName: md.global.Account.fullname,
                  });
                  return newOwnerObject;
                }
                var newOwnerObject = getNewOwnerObject();
                members = [newOwnerObject]
                  .concat(result.member)
                  .concat(members.filter(m => m.accountId !== newOwnerObject.accountId && m.accountId !== result.member.accountId));
                require(['./tpl/addMember.html'], function (tpl) {
                  var newOwnerHtml = doT.template(tpl)({ members: members, myPermis: root.permission });
                  $folderMemberBox.find('ul').html(newOwnerHtml)
                    .find('>li.Hidden').removeClass('Hidden');
                });
                root.members = members;
                // 是否存在已有用户
                // var $oldChargeLi = $this.closest('li.memberItem'),
                //   $newChargeLi = $folderMemberBox.find('li.memberItem[data-account-id="' + users[0].accountId + '"]'),
                //   isEqual = users[0].accountId == md.global.Account.accountId; //已是拥有者

                // if (!isEqual) {
                //   if ($newChargeLi.length > 0) {
                //     $newChargeLi
                //       .find('.permission').data('permission', PERMISSION_TYPE.OWNER)
                //       .find('.text').addClass('owner').html(_l('拥有者'))
                //       .next('i').remove();
                //     $newChargeLi.find('.remove').remove();
                //     $folderMemberBox.find('ul').prepend($newChargeLi.slideDown());
                //   } else {

                //     var ownerList = users.map(function (user) {
                //       user.accountStatus = ACCOUNT_STATUS.NORMAL;
                //       user.memberStatus = MEMBER_STATUS.NORMAL;
                //       user.permission = PERMISSION_TYPE.OWNER;
                //       user.inviterAccountId = md.global.Account.accountId;
                //       user.inviterFullName = md.global.Account.fullname;
                //       user.apkName = md.global.Account.fullname;
                //       user.roleName = md.global.Account.fullname;
                //       return user;
                //     });

                //     require(['./tpl/addMember.html'], function (tpl) {
                //       var newOwnerHtml = doT.template(tpl)({members: ownerList, myPermis: root.permission});
                //       $folderMemberBox.find('ul').prepend(newOwnerHtml)
                //         .find('>li.Hidden').slideDown();
                //     });
                //     root.members.push(ownerList[0]);
                //   }

                //   var $icon = $('<i class="icon-arrow-down-border"></i>').data('accountStatus', ACCOUNT_STATUS.NORMAL).data('memberStatus', MEMBER_STATUS.NORMAL);
                //   $oldChargeLi
                //     .find('.permission').data('permission', PERMISSION_TYPE.ADMIN)
                //     .find('.text').removeClass('owner').html(_l('管理员')).after($icon);
                //   $oldChargeLi.find('span.rootTrust').removeClass('rootTrust').addClass('remove exit').html(_l('退出'));

                //   root.members.forEach(function (m) {
                //     if (m.accountId === md.global.Account.accountId) {
                //       m.permission = PERMISSION_TYPE.ADMIN;
                //     }
                //     if (m.accountId === users[0].accountId && m.permission !== PERMISSION_TYPE.OWNER) {
                //       m.permission = PERMISSION_TYPE.OWNER;
                //     }
                //   });

                  _this.settings.deferred.notify(root);
                // }
              }).fail(function () {
                if (root.project && root.project.projectId) {
                  alert('操作失败, 只能托付给本组织的成员', 2);
                } else {
                  alert('操作失败，只能托付给好友或同事', 2);
                }

              });
            }

          }
        });
      });
    }).on('click', '.memberItem .toInvite', function () {
      var $this = $(this);
      var inviterId = $this.closest('.memberItem').data('accountId');
      kcAjax.resendInvite({id: rootId, memberId: inviterId}).then(function (result) {
        if (!result) {
          return $.Deferred().reject();
        }
        alert("邀请成功");
      }).fail(function () {
        alert('邀请失败, 请勿多次发送邀请', 3);
      })
    });

  },
  addRootMemers: function (users, root, isInvite, callbackInviteResult) {
    var createRoot = this;
    var uidCount = users.length;
    var user, isExistes, existsIds = [], newMemberIds = [], inviteAccount = {};
    var existingUsers = [];
    var canAddUsers = [];
    var _this = this;
    existsIds = $(".folderMemberBox li.memberItem").toArray().map(function (el) {
      return $(el).data('accountId') || $(el).data('account');
    });

    for (var i = 0; i < uidCount; i++) {
      user = users[i];
      isExistes = false;
      var itemAccount = user.accountId || user.account;
      if (user) {
        $.each(existsIds, function (i) {
          if (existsIds[i] === itemAccount) {
            isExistes = true;
            existingUsers.push(user);
            return false;
          }
        });
      }
      if (!isExistes) {
        canAddUsers.push(user);
        isInvite && user.account ? inviteAccount[user.account] = user.fullname : newMemberIds.push(user.accountId);
      }
    }
    if ((newMemberIds && newMemberIds.length) || Object.keys(inviteAccount).length) {
      if (!createRoot.settings.isEdit) {
        var newMembers = canAddUsers.map(function (user) {
          user.accountStatus = isInvite ? ACCOUNT_STATUS.INACTIVE : ACCOUNT_STATUS.NORMAL;
          user.memberStatus = root.permission == PERMISSION_TYPE.ADMIN || root.permission == PERMISSION_TYPE.OWNER ? MEMBER_STATUS.NORMAL : MEMBER_STATUS.INACTIVE;
          user.permission = PERMISSION_TYPE.NORMAL;
          user.inviterAccountId = md.global.Account.accountId;
          user.inviterFullName = md.global.Account.fullname;
          return user;
        });
        require(['./tpl/addMember.html'], function (tpl) {
          var memberHtml = doT.template(tpl)({members: newMembers, myPermis: root.permission, isEdit: false});
          $('.folderMembers .folderMemberBox ul').append(memberHtml);
          $('.folderMembers .folderMemberBox ul li.Hidden').slideDown(_this.nanoScroller);
        });
        if (callbackInviteResult && $.isFunction(callbackInviteResult)) {
          callbackInviteResult({status: 1});
        }
        if (existingUsers && existingUsers.length) {
          alert(existingUsers.map(function (u) {
              return u.fullname || u.account || '';
            }) + "已存在列表中");
        }
        return;
      }
      //console.log(inviteAccount);
      kcAjax.addRootMembers({
        id: createRoot.settings.id,
        memberIds: newMemberIds,
        inviteAccount: inviteAccount,
      }).then(function (res) {
        if (!res) {
          return $.Deferred().reject();
        }

        var successMembers = res.successMembers;
        var failedAccountInfos = res.failedAccountInfos;
        var existAccountInfos = res.existAccountInfos;
        var limitAccountInfos = res.limitAccountInfos;


        if (!(successMembers && successMembers.length)
          && !(existAccountInfos && existAccountInfos.length)
          && !(res.successAccountInfos && res.successAccountInfos.length)) {
          return $.Deferred().reject();
        }
        if (callbackInviteResult && $.isFunction(callbackInviteResult)) {
          callbackInviteResult({status: 1});
        }


        if (successMembers && successMembers.length) {
          //添加到Root成员列表中
          root.members.concat(successMembers);
          var newMembers = successMembers.filter(function (m) {
            return existsIds.indexOf(m.accountId.toLowerCase()) < 0;
          });

          if (newMembers && newMembers.length) {
            require(['./tpl/addMember.html'], function (tpl) {
              var memberHtml = doT.template(tpl)({members: successMembers, myPermis: root.permission, isEdit: true});
              $('.folderMembers .folderMemberBox ul').append(memberHtml);
              $('.folderMembers .folderMemberBox ul li.Hidden').slideDown(_this.nanoScroller);
            });

            createRoot.settings.deferred.notify($.extend({}, root, {members: root.members}));
          }
        }

        require(['src/components/common/function'], function (mdFunc) {
          mdFunc.existAccountHint({
            results: [{
              accountInfos: res.successAccountInfos,
              existAccountInfos: existAccountInfos,
              failedAccountInfos: failedAccountInfos,
              limitAccountInfos: limitAccountInfos,
            }]
          });
        });

      }).fail(function () {
        alert('邀请失败，请稍后重试', 2);
        if (callbackInviteResult && $.isFunction(callbackInviteResult)) {
          callbackInviteResult({status: 1});
        }
      });
    } else {
      if (callbackInviteResult && $.isFunction(callbackInviteResult)) {
        callbackInviteResult({status: 0});
      }
      alert('您邀请的用户已在共享文件夹中', 3);
      // require.async('src/components/common/function.js', function (mdFunc) {
      //     mdFunc.existAccountHint({ results: [{
      //       accountInfos: [],
      //       existAccountInfos: existingUsers,
      //       failedAccountInfos: [],
      //       limitAccountInfos: [],
      //     }] });
      // });
      // var errorMsg = '以下用户已存在成员列表中,不能重复添加：';
      // if (existingUsers && existingUsers.length) {
      //   errorMsg += existingUsers.map(function (u) { return '</br>' + (u.fullname || u.account || ''); });
      // }
      // alert(errorMsg, 3);
    }
  },
  verifyName: function (name, originalName) {
    var $txtFolderName = $('#createFolderBox .folderName .txtFolderName');
    //名称为null时
    if (!name) {
      var num = 0;
      var setTime = setInterval(function () {
        $txtFolderName.toggleClass('nullDataHintBox');
        if (num++ > 3) {
          $txtFolderName.removeClass('nullDataHintBox').focus();
          clearInterval(setTime);
        }
      }, 300);
      $txtFolderName.val('');
      return false;
    } else {
      if (name && name.length > 255) {
        alert("文件名称过长,请保持名称在255个字符以内", 3, 3000);
        return false;
      }
      var illegalChars = /[\/\\\:\*\?\"\<\>\|]/g,
        valid = illegalChars.test(name);
      if (valid) {
        alert('名称不能包含以下字符：\\ / : * ? " < > | #', 3);
        name = name.replace(illegalChars, '') || (originalName ? originalName : '');
        $txtFolderName.val(name).select();
        return false;
      }
    }

    return true;
  },
  nanoScroller: function () {
    var $folderMemberBox = $('.folderMembers .folderMemberBox');
    var $memberListItem = $folderMemberBox.find('.memberList .memberItem');
    if ($memberListItem.height() * $memberListItem.length >= 300) {
      $folderMemberBox.find('.nanoCon').addClass('nano').find('.memberList').addClass('nano-content');
      $folderMemberBox.find('.nanoCon').nanoScroller();
    } else {
      $folderMemberBox.find('.nanoCon').removeClass('nano').find('.memberList').removeClass('nano-content');
    }
  }
});

module.exports = function (param) {
  var deferred = $.Deferred();
  param = $.extend({deferred: deferred}, param);
  /**
   * 创建或编辑共享文件夹的方法
   * @function external:
   * @param {object} param 初始化数据
   * @param {boolean} param.isEdit 是否是编辑共享文件夹
   * @param {string} param.id     root.id
   * @param {boolean}  param.isStared 共享文件夹是否标星
   * @param {string}   param.name  共享文件夹名称
   * @param {array}  param.members  共享文件夹成员列表
   */
  new RootSettings(param);
  return deferred.promise();
};
