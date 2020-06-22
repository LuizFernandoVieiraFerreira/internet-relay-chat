/**
* @Author Luiz Fernando Vieira de Castro Ferreira
* @date Novembro, 2016
* @brief Arquivo do cliente
*
* Arquivo responsável pela manipulação dos elementos
* da interface e pelo envio de mensagens ao servidor.
* A aplicação cliente guarda apenas dados relativos ao
* nome do usuário que está utilizando a aplicação
* e o nome do grupo que aquele usuário faz parte
*/

/**
* Variáveis responsáveis por guardar informações
* relativas aos clientes da aplicação
*/
var socket = io();
var userSessionName = '';
var currentGroup = '';

/**
* Todo conteúdo dentro desse procedimento será
* inicializado assim que o evento document.ready
* for disparado, ou seja, só quando o documento
* HTML tiver sido totalmente carregado
*/
$(function() {

  /**
  * Variáveis ligadas a tags HTML. Tais variáveis
  * serão manipuladas para que a interface do
  * sistema seja alterada dependendo das ações
  * do cliente e das respostas do servidor
  */
  var userFormArea = $('#userFormArea');
  var menuArea = $('#menuArea');
  var groupFormArea = $('#groupFormArea');
  var messageArea = $('#messageArea');
  var userForm = $('#userForm');
  var groupForm = $('#groupForm');
  var messageForm = $('#messageForm');
  var users = $('#users');
  var groups = $('#groups');
  var username = $('#username');
  var groupName = $('#groupName');
  var createGroup = $('#createGroup');
  var message = $('#message');
  var chat = $('#chat');

  /**
  * Emite um evento do tipo message of the day
  * que pede para o servidor a data o horário e
  * a lista dos comando que o cliente pode executar.
  * Ao receber a resposta um sweet alert será
  * mostrado na tela do cliente com todos os dados
  * que ele havia requisitado previamente
  */
  socket.emit('message of the day', function(message){
    var date = new Date(parseInt(message.date)*1000).toString();
    var result = date.substring(0, 10).replace(/-/g,'/');
    var time = date.substring(16, 24);
    var commands = '<br><br>';
    var breakLine = 0;

    for(var i=0; i<message.commands.length; i++) {
      breakLine++;
      commands += message.commands[i] + ' ';
      if(breakLine >= 5) {
        commands += '<br>';
        breakLine = 0;
      }
    }

    swal({
      title: 'Message of the Day !',
      text: '<h4>'
        +     'Date: <br><br> <span style="color:#F8BB86">'
        +        result + '<br>' + time
        +     '</span><br><br>'
        +     'Commands: <span style="color:#F8BB86">'
        +        commands
        +     '</span>'
        +    '</h4>',
      html: true
    }, function(){
      userFormArea.show();
    });
  });

  /**
  * Emite um evento do tipo new user quando o
  * usuário realiza o submit do formulário. Esse
  * evento pede para o servidor que crie um usuário cujo
  * nome foi passado pelo cliente no campo de texto
  */
  userForm.submit(function(e) {
    e.preventDefault();
    if(isSuccessfulAuthentication()) {
      userSessionName = username.val();
      socket.emit('new user', username.val(), function(data){
        if(data) {
          userFormArea.hide();
          menuArea.show();
          socket.emit('show groups');
        }
      });
    }
    username.val('');
  });

  /**
  * Escuta pela emissão de um evento do tipo get
  * groups para atualizar a lista de grupos da
  * aplicação cliente
  */
  socket.on('get groups', function(g) {
    var html = '';
    var usn = userSessionName;
    for(i=0; i<g.length; i++) {
      var adm = g[i].admin;
      var joinBtn = usn === adm ? 'btn-warning" ' : 'btn-info" ';
      var deleteBtn = usn === adm ? 'btn-danger" ' : 'disabled" ';
      html += ''
        +     '<tr>'
        +      '<td>' + g[i].name + '</td>'
        +      '<td>'
        +        '<button class="btn ' + joinBtn
        +          'onclick="join(\''+ g[i].name +'\');">'
        +           'Join'
        +        '</button>'
        +      '</td>'
        +      '<td>'
        +        '<button class="btn ' + deleteBtn
        +          'onclick="remove(\''+ g[i].name +'\');">'
        +          'Delete'
        +        '</button>'
        +      '</td>'
        +     '</tr>';
    }
    groups.html(html);
  });

  /**
  * Escuta o evento de click do cliente
  * para alterar a interface do sistema
  * levando o usuário para uma tela que
  * mostra todos os grupos existentes
  */
  createGroup.click(function(e) {
    menuArea.hide();
    groupFormArea.show();
  });

  /**
  * Emite um evento do tipo new group quando o usuário
  * realiza o submit do formulário. Esse evento pede
  * para o servidor criar um novo grupo cujo nome é
  * aquele passado pelo cliente no campo de texto
  */
  groupForm.submit(function(e) {
    e.preventDefault();
    var group = {
      name: groupName.val(),
      admin: userSessionName,
      users: [
        userSessionName
      ],
      bans: []
    }
    socket.emit('new group', group, function(data){
      if(data) {
        groupFormArea.hide();
        menuArea.show();
      }
    });
    groupName.val('');
  });

  /**
  * Escuta o evento other user joined this
  * this groups para alertar o usuário de que
  * outro usuário acaba de entrar no grupo
  * fazendo com que a interface fosse atualizada
  * para mostrar o nome deste novo usuário
  */
  socket.on('other user joined this group', function(userName) {
    var html = ''
      +  '<li class="list-group-item">'
      +    userName
      + '</li>';
    users.append(html);
  });

  /**
  * Escuta o evento goto messages para que a interface
  * do cliente seja atualizada e passe a mostrar uma
  * tela das mensagens de certo grupo
  */
  socket.on('goto messages', function(group) {
    socket.emit('get users on this group', group, function(u){
      var html = '';
      var btnDelete = '';
      socket.emit('group with name', group, function(g) {
        console.log("chegou");
        console.log(g.admin);
        if(g) {
          btnDelete = userSessionName != g.admin ?
            '' : '<span class="btn-danger pull-right glyphicon glyphicon-remove" />';
        }
        for(var i=0; i<u.length; i++) {
          html += '<li class="list-group-item">'
                 +   u[i]
                 +   btnDelete
                 + '</li>';
        }
        users.html(html);
      });
    });
    menuArea.hide();
    messageArea.show();
  });

  /**
  * Escuta o evento other user joined this
  * this groups para alertar o usuário de que
  * outro usuário acaba de entrar no grupo
  * fazendo com que a interface fosse atualizada
  * para mostrar o nome deste novo usuário
  */
  socket.on('ask for permission', function() {
    swal('Join', 'Você pediu permissão para entrar neste grupo, ' +
            'aguarde a resposta do administrador do grupo');
  });

  /**
  * Escuta o evento asked for permission para alertar
  * o administrador de certo grupo que existe um usuário
  * que fez uma requisição para entrar em um grupo que
  * aquele administrador administra
  */
  socket.on('asked for permission', function(user, group) {
    swal({
      title: 'O usuário ' + user + ' deseja entrar no seu grupo, ' +
             'você permite que ele entre?',
      type: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#A5DC86',
      confirmButtonText: 'Sim',
      cancelButtonText: 'Não',
      closeOnConfirm: false,
      closeOnCancel: false
    },
    function(isConfirm){
      if (isConfirm) {
        swal('Ok!', user + ' entrou no grupo ' + group, 'success');
        socket.emit('aceito que entre', user, group);
      } else {
        swal('Ok', 'O pedido do usuário ' + user + ' foi negado' , 'error');
        socket.emit('rejeito que entre', user);
      }
    });
  });

  /**
  * Escuta o evento deny because of ban para
  * informar um usuário que havia feito uma
  * requisição para entrar em determinado grupo
  * que o administrador daquele grupo acaba
  * de recusar sua entrada
  */
  socket.on('deny because of ban', function() {
      swal('Banido', 'O pedido foi recusado pois você está banido deste '
      + ' grupo' , 'error');
  });

  /**
  * Escuta o evento me atualizo dos demais do grupo
  * para forçar o usuário de determinado grupo a
  * atualizar sua lista de usuários daquele grupo.
  * Isso ocorre pois o usuário não tem como adivinhar
  * que outra pessoa entrou no grupo que ele faz parte
  * a menos que o servidor o notifique disso
  */
  socket.on('me atualizo dos demais do grupo', function(usersOnThatGroup) {
    console.log("testando: " + usersOnThatGroup);
    var html = '';
    for(i=0; i<usersOnThatGroup.length; i++) {
      html += '<li class="list-group-item">' + usersOnThatGroup[i] + '</li>';
    }
    $('#users').html(html);
  });

  /**
  * Escuta o evento permission accepted para informar
  * um usuário que havia pedido permissão para entrar
  * em um determinado grupo que o administrador daquele
  * grupo acaba de aceitar seu pedido
  */
  socket.on('permission accepted', function(){
    swal({
      title: 'Ótimo!',
      text: 'Seu pedido foi aceito.',
      imageUrl: 'img/thumbs-up.jpg'
    });
  });

  /**
  * Escuta o evento permission rejected para informar
  * um usuário que havia pedido permissão para entrar
  * em um determinado grupo que o administrador daquele
  * grupo acaba de recusar seu pedido
  */
  socket.on('permission rejected', function(){
    swal('Ops', 'O administrador rejeitou seu pedido', 'error');
  });

  /**
  * Emite um evento do tipo send message quando o usuário
  * realiza o submit do formulário. Esse evento pede
  * para o servidor fazer o broadcast da mensagem para
  * todos os usuários que estão presentes naquele grupo
  * no instante que a mensagem foi enviada
  */
  messageForm.submit(function(e) {
    e.preventDefault();
    socket.emit('send message', message.val(), currentGroup, userSessionName);
    message.val('');
  });

  /**
  * Escuta o evento new message para informar o cliente
  * de que algum dos usuários conectados ao grupo que
  * este cliente está conectado enviou uma mensagem
  */
  socket.on('new message', function(data) {
    chat.append('' +
      '<div class="well">' +
        '<strong>'+ data.user + '</strong>: ' + data.msg +
      '</div>'
    );
  });

  /**
  * Escuta o evento de click disparado pelo javascript
  * para alterar a interface cliente simulando uma
  * troca de tela para a tela anterior
  */
  $('#voltar').click(function() {
    messageArea.hide();
    chat.children().hide();
    currentGroup = '';
    menuArea.show();
    socket.emit('show groups');
  });

  /**
  * Escuta o evento you have been kicked para informar
  * o cliente de que o administrador do grupo que ele
  * estava conectado acaba de kicka-lo daquele grupo
  */
  socket.on('you have been kicked', function() {
    swal({
      title: 'Ops',
      text: 'Você foi kickado desse grupo'
    });
    messageArea.hide();
    chat.children().hide();
    currentGroup = '';
    menuArea.show();
    socket.emit('show groups');
  });

  /**
  * Escuta o evento you have been kicked para informar
  * o cliente de que o administrador do grupo que ele
  * estava conectado acaba de bani-lo daquele grupo
  */
  socket.on('you have been banned', function() {
    swal({
      title: 'Ops',
      text: 'Você foi banido desse grupo'
    });
    messageArea.hide();
    chat.children().hide();
    currentGroup = '';
    menuArea.show();
    socket.emit('show groups');
  });

  /**
  * Escuta o evento change disparado pelo javascript
  * quando o cliente muda o caminho do arquivo que
  * será enviado para o servidor
  */
  $('#inputFile').on('change', function(e) {
    var file = e.originalEvent.target.files[0];
    var reader = new FileReader();
    reader.onload = function(e) {
      console.log("dota: " + e.target.result);
      socket.emit('send file', e.target.result);
    }
    if(file) { reader.readAsDataURL(file); }
  });

  /**
  * Escuta o evento new file para indicar para o
  * cliente que um novo arquivo acaba de chegar
  * da aplicação servidora para a cliente
  */
  socket.on('new file', function(file) {
    swal({
      title: 'Novo arquivo',
      text: 'Clique em cima para começar o download'
    });
    $('#files').append(''
      + '<li>'
      +    '<a href="' + file + '" download>'
      +      '<span class="glyphicon glyphicon-file" />'
      +    '</a>'
      + '</li>'
    );
  });

  /**
  * Escuta o evento user away para indicar que o
  * usuário esta away from keyboard e que mensagens
  * particulares não mais poderão ser enviadas
  * para aquele usuário afk
  */
  socket.on('user away', function(userName) {
    chat.append('' +
      '<div class="well text-center">' +
        userName + ' away' +
      '</div>'
    );
  });

  /**
  * Escuta o evento user no longer away que informa
  * para todos os cliente de certo grupo que um
  * usuário que estava away não está mais
  */
  socket.on('user no longer away', function(userName) {
    chat.append('' +
      '<div class="well text-center">' +
        userName + ' voltou' +
      '</div>'
    );
  });

  /**
  * Escuta o evento target is away para informar
  * a um cliente que acaba de enviar uma mensagem
  * privada que o usuário target desse mensagem
  * está away, logo, não pode receber mensagens
  */
  socket.on('target is away', function(userName) {
    swal('Ops', 'A mensagem não pode ser enviada pois o usuário ' +
    userName + ' está AFK.');
  });
});

/**
* Emite um evento sinalizando o desejo de um
* usuário de entrar em determinado grupo
*/
function join(group) {
  currentGroup = group;
  $('#chat').children().hide();
  socket.emit('join group', group, userSessionName, function(usersOnThatGroup){
    var html = '';
    for(i=0; i<usersOnThatGroup.length; i++) {
      html += '<li class="list-group-item">' + usersOnThatGroup[i] + '</li>';
    }
    $('#users').html(html);
  });
}

/**
* Emite um evento sinalizando o desejo de um
* usuário administrador de um grupo de
* deletar aquele grupo que administra
*/
function remove(group) {
  socket.emit('delete group', group, userSessionName, function(data){
    if(data) {
      socket.emit('show groups');
    } else {
      swal('Não é possível deletar este grupo', 'Antes de deletar este '
      + 'grupo você deve excluir todos os seus membros' , 'error');
    }
  });
}

/**
* Cuida da criação de um novo grupo
* gerenciando o nome do grupo, o usuário
* administrador, e os usuários que
* aquele grupo terá inicialmente
*/
function handleCreate(groupName) {
  var group = {
    name: groupName,
    admin: userSessionName,
    users: [
      userSessionName
    ]
  }
  socket.emit('new group', group, function(data){});
}
