/*
 * @prettier
 */

'use strict';

const View = {
  icons: {
    delete: function () {
      return HtmlBuilder.icon({ class: 'far fa-trash-alt' });
    },
    edit: function () {
      return HtmlBuilder.icon({ class: 'far fa-edit' });
    },
    saved: function () {
      return HtmlBuilder.icon({ class: 'far fa-save success-color-dark' });
    },
    save: function () {
      return HtmlBuilder.icon({ class: 'far fa-save' });
    },
    cancel: function () {
      return HtmlBuilder.icon({ class: 'far fa-window-close' });
    },
    check: function () {
      return HtmlBuilder.icon({ class: 'fas fa-check' });
    },
    valid: function () {
      return HtmlBuilder.icon({ class: 'fas fa-check success-color-dark' });
    },
    cogs: function () {
      return HtmlBuilder.icon({ class: 'fas fa-cogs' });
    },
    modified: function () {
      return HtmlBuilder.icon({ class: 'fas fa-pen warning-color-dark' });
    },
    add: function () {
      return HtmlBuilder.icon({ class: 'fas fa-plus' });
    },
    link: function () {
      return HtmlBuilder.icon({ class: 'fas fa-link' });
    },
    unlink: function () {
      return HtmlBuilder.icon({ class: 'fas fa-unlink' });
    }
  },
  buttons: {
    edit: function (text = '') {
      return HtmlBuilder.button({ class: 'btn btn-primary btn-sm' }).text(text).append(View.icons.edit());
    },
    delete: function (text = '') {
      return HtmlBuilder.button({ class: 'btn btn-danger btn-sm btn-lite' }).text(text).append(View.icons.delete());
    },
    save: function (text = '') {
      return HtmlBuilder.button({ class: 'btn btn-primary btn-sm' }).text(text).append(View.icons.save());
    },
    cancel: function (text = '') {
      return HtmlBuilder.button({ class: 'btn btn-primary btn-sm' }).text(text).append(View.icons.cancel());
    },
    add: function (text = '') {
      return HtmlBuilder.button({ class: 'btn btn-primary btn-sm' }).text(text).append(View.icons.add());
    },
    link: function (text = '') {
      return HtmlBuilder.button({ class: 'btn btn-primary btn-sm btn-lite' }).text(text).append(View.icons.link());
    },
    unlink: function (text = '') {
      return HtmlBuilder.button({ class: 'btn btn-danger btn-sm btn-lite' }).text(text).append(View.icons.unlink());
    },
    default: function (text = '') {
      return HtmlBuilder.button({ class: 'btn btn-primary btn-sm' }).text(text);
    },
    help: function (text = '') {
      return HtmlBuilder.button({
        class: 'btn btn-secondary btn-sm pull-right float-right',
        'data-toggle': 'modal',
        'data-target': '#theHelp'
      }).text(text);
    }
  },
  status: {
    edition: function (id) {
      let self = this,
        elements = {
          container: HtmlBuilder.div({ id: id, class: '', text: '' }),
          modified: View.icons.modified(),
          saved: View.icons.saved(),
          valid: View.icons.valid()
        },
        _value = '';

      self.status = {
        modified: 'modified',
        saved: 'saved',
        valid: 'valid'
      };

      self.id = function (value) {
        if (typeof value === 'undefined') return elements.container.attr('id');
        elements.container.attr('id', id);
        return self.id();
      };

      self.value = function (value) {
        if (typeof value === 'undefined') return _value;
        _value = value;
        self.refresh();
        return self.value();
      };

      self.removeChildrens = function () {
        elements.modified.detach();
        elements.valid.detach();
        elements.saved.detach();
      };

      self.refresh = function () {
        let status = self.status[self.value()];
        if (typeof status !== 'undefined') {
          self.removeChildrens();
          elements[status].appendTo(elements.container);
        }
        return self.elements().container;
      };

      self.modified = function () {
        self.value(self.status.modified);
        return self.elements().container;
      };

      self.saved = function () {
        self.value(self.status.saved);
        return self.elements().container;
      };

      self.valid = function () {
        self.value(self.status.valid);
        return self.elements().container;
      };

      self.elements = function () {
        return elements;
      };

      return self;
    }
  },
  properties: {
    uneditable: {
      text: function (data) {
        let self = this,
          elements = {
            container: HtmlBuilder.div({ id: data.id, class: '', text: '' }),
            key: HtmlBuilder.div({ class: 'key', text: data.key }),
            data: HtmlBuilder.div({ class: 'value', text: data.value })
          };

        if (typeof data.help === 'object') {
          self.help = function (options) {
            if (typeof options !== 'undefined') {
              if (options.href) {
                elements.help.attr('href', options.href.replace('.io/', '.ai/'));
                if (self.title) elements.container.attr('title', self.title + options.href);
              }
              if (options.title) elements.container.attr('title', options.title);
              if (options.text) elements.help.text(options.text);
            }
            return elements.help;
          };

          if (data.help.href && data.help.text)
            elements.help = HtmlBuilder.a({
              href: data.help.href,
              text: data.help.text
            });

          if (data.help.title) {
            self.title = data.help.title;
            elements.container.attr('title', data.help.title);
          }
        }

        self.id = function (value) {
          if (typeof value === 'undefined') return elements.container.attr('id');
          elements.container.attr('id', id);
          return self.id();
        };

        self.value = function (value) {
          if (typeof value === 'undefined') return elements.data.html();
          elements.data.html(value);
          return self.value();
        };

        self.key = function (value) {
          if (typeof value === 'undefined') return elements.key.text();
          elements.key.text(value);
          return self.key();
        };

        self.removeChildrens = function () {
          elements.key.detach();
          elements.data.detach();
          if (typeof elements.help !== 'undefined') elements.help.detach();
        };

        self.view = function () {
          self.removeChildrens();
          elements.key.appendTo(elements.container);
          if (typeof elements.help !== 'undefined') elements.help.appendTo(elements.container);
          elements.data.appendTo(elements.container);
          return self.elements().container;
        };

        self.elements = function () {
          return elements;
        };

        return self;
      }
    },
    editable: {
      text: function (data, events) {
        let self = this,
          elements = {
            container: HtmlBuilder.div({ id: data.id, class: '', text: '' }),
            key: HtmlBuilder.div({ class: 'key', text: data.key }),
            data: HtmlBuilder.div({ class: 'value', text: data.value }),
            input: HtmlBuilder.input({
              type: 'text',
              placeholder: data.placeholder,
              value: data.value
            }),
            edit: View.buttons.edit(),
            save: View.buttons.save(),
            cancel: View.buttons.cancel()
          };

        if (typeof data.help === 'object') {
          self.help = function (options) {
            if (typeof options !== 'undefined') {
              if (options.href) {
                elements.help.attr('href', options.href.replace('.io/', '.ai/'));
                if (self.title) elements.container.attr('title', self.title + options.href);
              }
              if (options.title) elements.container.attr('title', options.title);
              if (options.text) elements.help.text(options.text);
            }
            return elements.help;
          };
          if (data.help.href && data.help.text)
            elements.help = HtmlBuilder.a({
              href: data.help.href,
              text: data.help.text
            });
          if (data.help.title) {
            self.title = data.help.title;
            elements.container.attr('title', data.help.title);
          }
        }

        elements.input.bind('input propertychange', function () {
          self.value(elements.input.val());
          events.onChange(self);
        });

        elements.edit.click(function () {
          self.edit();
          events.onEdit(self);
        });

        elements.save.click(function () {
          self.value(elements.input.val());
          self.view();
          events.onSave(self);
        });

        elements.cancel.click(function () {
          self.view();
          events.onCancel(self);
        });

        self.id = function (value) {
          if (typeof value === 'undefined') return elements.container.attr('id');
          elements.container.attr('id', id);
          return self.id();
        };

        self.value = function (value) {
          if (typeof value === 'undefined') return elements.data.html();
          elements.data.html(value);
          elements.input.val(value);
          return self.value();
        };

        self.key = function (value) {
          if (typeof value === 'undefined') return elements.key.text();
          elements.key.text(value);
          return self.key();
        };

        self.removeChildrens = function () {
          elements.key.detach();
          elements.data.detach();
          elements.input.detach();
          elements.edit.detach();
          elements.save.detach();
          elements.cancel.detach();
          if (typeof elements.help !== 'undefined') elements.help.detach();
        };

        self.view = function () {
          self.removeChildrens();
          elements.key.appendTo(elements.container);
          if (typeof elements.help !== 'undefined') elements.help.appendTo(elements.container);
          elements.data.appendTo(elements.container);
          elements.edit.appendTo(elements.container);
          return self.elements().container;
        };

        self.edit = function (buttons = true) {
          self.removeChildrens();
          elements.key.appendTo(elements.container);
          if (typeof elements.help !== 'undefined') elements.help.appendTo(elements.container);
          elements.input.appendTo(elements.container);
          if (buttons) {
            elements.save.appendTo(elements.container);
            elements.cancel.appendTo(elements.container);
          }
          return self.elements().container;
        };

        self.elements = function () {
          return elements;
        };

        return self;
      },
      textarea: function (data, events) {
        let self = this,
          elements = {
            container: HtmlBuilder.div({ id: data.id, class: '', text: '' }),
            key: HtmlBuilder.div({ class: 'key', text: data.key }),
            data: HtmlBuilder.textarea({
              placeholder: data.placeholder,
              value: data.value,
              rows: data.rows
            })
          };

        elements.data.bind('input propertychange', function () {
          self.value(elements.data.val());
          events.onChange(self);
        });

        self.id = function (value) {
          if (typeof value === 'undefined') return elements.container.attr('id');
          elements.container.attr('id', id);
          return self.id();
        };

        self.value = function (value) {
          if (typeof value === 'undefined') return elements.data.val();
          elements.data.val(value);
          return self.value();
        };

        self.key = function (value) {
          if (typeof value === 'undefined') return elements.key.text();
          elements.key.text(value);
          return self.key();
        };

        self.removeChildrens = function () {
          elements.key.detach();
          elements.data.detach();
        };

        self.view = function () {
          self.removeChildrens();
          elements.key.appendTo(elements.container);
          elements.data.appendTo(elements.container);
          return self.elements().container;
        };

        self.elements = function () {
          return elements;
        };

        return self;
      },
      select: function (data, events) {
        let self = this,
          elements = {
            container: HtmlBuilder.div({ id: data.id, class: '', text: '' }),
            key: HtmlBuilder.div({ class: 'key', text: data.key }),
            data: HtmlBuilder.div({ class: 'value', text: data.value }),
            input: HtmlBuilder.select(data.options),
            edit: View.buttons.edit(),
            save: View.buttons.save(),
            cancel: View.buttons.cancel()
          };

        elements.input.bind('input propertychange', function () {
          self.value(elements.input.val());
          events.onChange(self);
        });

        elements.edit.click(function () {
          self.edit();
          events.onEdit(self);
        });

        elements.save.click(function () {
          self.value(elements.input.val());
          self.view();
          events.onSave(self);
        });

        elements.cancel.click(function () {
          self.view();
          events.onCancel(self);
        });

        self.options = function (values) {
          if (!values)
            return elements.input.find('option').map(function () {
              return jQuery(this).val();
            });
          elements.input.empty();
          for (var i = 0; i < values.length; i++) {
            elements.input.append(
              new HtmlBuilder.option({
                value: values[i].value,
                text: values[i].text
              })
            );
          }
          return self.options();
        };

        self.id = function (value) {
          if (typeof value === 'undefined') return elements.container.attr('id');
          elements.container.attr('id', id);
          return self.id();
        };

        self.value = function (value) {
          if (typeof value === 'undefined') return elements.data.text();
          elements.input.find('option[value="' + value + '"]').prop('selected', true);
          elements.data.text(elements.input.find('option:selected').val());
          return self.value();
        };

        self.key = function (value) {
          if (typeof value === 'undefined') return elements.key.text();
          elements.key.text(value);
          return self.key();
        };

        self.removeChildrens = function () {
          elements.key.detach();
          elements.data.detach();
          elements.input.detach();
          elements.edit.detach();
          elements.save.detach();
          elements.cancel.detach();
        };

        self.view = function () {
          self.removeChildrens();
          elements.key.appendTo(elements.container);
          elements.data.appendTo(elements.container);
          elements.edit.appendTo(elements.container);
          return self.elements().container;
        };

        self.edit = function (buttons) {
          self.removeChildrens();
          elements.key.appendTo(elements.container);
          elements.input.appendTo(elements.container);
          if (buttons) {
            elements.save.appendTo(elements.container);
            elements.cancel.appendTo(elements.container);
          }
          return self.elements().container;
        };

        self.elements = function () {
          return elements;
        };

        return self;
      }
    }
  },
  links: {
    static: function (data, events) {
      let self = this,
        elements = {
          container: HtmlBuilder.li({ class: data.class, text: '' }),
          data: HtmlBuilder.div({
            value: data.value,
            class: 'item',
            text: data.text
          }),
          status: new View.status.edition(),
          delete: View.buttons.delete(),
          link: View.buttons.link()
        };

      self.status = function () {
        elements.status.value();
      };

      self.value = function (value) {
        if (typeof value === 'undefined') return elements.data.attr('value');
        elements.data.attr('value', value);
        return self.value();
      };

      self.elements = function () {
        return elements;
      };

      self.delete = function () {
        elements.container.remove();
      };

      elements.container
        .append(elements['data'])
        .append(elements['status'].elements().container)
        .append(elements['link'])
        .append(elements['delete']);

      elements.data.click(function () {
        events.onClick(self.value());
      });

      elements.delete.click(function () {
        events.onDelete(self.value());
      });

      elements.link.click(function () {
        events.onLink(self.value());
      });

      return self;
    },
    deletable: function (data, events) {
      let self = this,
        elements = {
          container: HtmlBuilder.div({ class: data.class, text: '' }),
          data: HtmlBuilder.div({
            value: data.value,
            class: 'value',
            text: data.text
          }),
          status: new View.status.edition(),
          delete: View.buttons.delete(),
          link: View.buttons.link()
        };

      self.status = function () {
        elements.status.value();
      };

      self.value = function (value) {
        if (typeof value === 'undefined') return elements.data.attr('value');
        elements.data.attr('value', value);
        return self.value();
      };

      self.elements = function () {
        return elements;
      };

      elements.container
        .append(elements['data'])
        .append(elements['status'].elements().container)
        .append(elements['link'])
        .append(elements['delete']);

      elements.data.click(function () {
        events.onClick(self.value());
      });

      elements.delete.click(function () {
        elements.container.remove();
        events.onDelete(self.value());
      });

      elements.link.click(function () {
        events.onLink(self.value());
      });

      return self;
    }
  },
  forms: {
    row: function (events) {
      return HtmlBuilder.div({ id: '', class: 'form-row', text: '' });
    },
    row_centered: function (events) {
      return HtmlBuilder.div({
        id: '',
        class: 'form-row centered',
        text: '',
        style: 'width:100%;align-text:center;'
      });
    }
  }
};
