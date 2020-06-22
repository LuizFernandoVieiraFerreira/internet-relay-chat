/**
* @Author Luiz Fernando Vieira de Castro Ferreira
* @date Novembro, 2016
* @brief Arquivo do servidor
*
* Arquivo responsável pelo armazenamento em memória e
* pela lógica da manipulação dos dados presentes
* no lado servidor da aplicação. Aqui estão presentes
* as diferentes funções responsável pelo tratamento
* dos eventos enviados por diferentes clientes
*/

var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
// var fs = require('fs');

/**
* Variáveis responsáveis por guardar o estado
* do sistema. Com apenas as variáveis que
* guardam os usuários, grupos e suas respectivas
* sockets é possível simular a existência de
* um banco de dados em memória que guarda
* os estados dos diferentes grupos
*/

users = [];
groups = [];
connections = [];
awayUsrs = [];

/**
* Inicializa o servidor e o coloca em um estado de escuta
* onde este fica observando determinada porta
*/
server.listen(process.env.PORT || 3000)
console.log('Server running...');
app.use(express.static(__dirname));

/**
* Direciona o usuário para a página index.html
* quando este acessa o site com a url '/'
*/
app.get('/', function(req, res){
	res.sendFile(__dirname + '/index.html');
});

/**
* Escuta pela emissão de um
* evento do usuário cliente
*/
io.on('connection', function(socket){
	connections.push(socket);
  // fs.writeFile("log.txt", getLogDateTime() + "Cria socket! \n", { flag: 'a' });
	console.log('Connected: %s sockets connected', connections.length);

  /**
  * Escuta pela emissão de um evento do tipo disconnect
  * para desconectar o usuário do sistema tirando seu
  * nome da lista de usuários e se livrando do socket
  * do usuário responsável pelo envio da mensagem
  */
  socket.on('disconnect', function(){
    users.splice(users.indexOf(socket.username), 1);
    connections.splice(connections.indexOf(socket), 1);
    // fs.writeFile("log.txt", getLogDateTime() + "Deleta socket! \n", { flag: 'a' });
    console.log('Disconnected: %s sockets connected', connections.length);
  });

  /**
  * Escuta pela emissão de um evento do tipo message
  * of the day para que o servidor informe o cliente
  * da data atual e de todos os possíveis comandos que
  * aquele cliente pode executar no terminal
  */
  socket.on('message of the day', function(callback){
    var d = parseInt((new Date)/1000);
    message = {
      date: d.toString(),
      commands: [
        '/help', '/nick', '/leave', '/list', '/join',
        '/create', '/delete', '/away', '/msg', '/ban', '/kick',
        '/clear', '/file', '/list_files', '/get_file'
      ]
    }
    // fs.writeFile("log.txt", getLogDateTime() +
    // "Envia mensagem do dia. \n", { flag: 'a' });
    callback(message);
  });

  /**
  * Escuta pela emissão de um evento do tipo new
  * user para adicionar um novo usuario na lista
  * de usuários guardada pelo servidor em memória.
  * Além de adicionar um usuário a lista de usuários
  * é adicionado um socket a lista de socket que
  * liga aquele nome de usuário a um socket
  */
  socket.on('new user', function(username, callback){
    callback(true);
    socket.username = username;
    users.push(socket.username);
    // fs.writeFile("log.txt", getLogDateTime() +
    // "Cria novo usuário. \n", { flag: 'a' });
  });

  /**
  * Escuta pela emissão de um evento do tipo show
  * groups para alertar o usuário de todos os
  * grupos existentes no sistema no momento que
  * o usuário fez a requisição
  */
  socket.on('show groups', function(){
    socket.emit('get groups', groups);
  });

  /**
  * Escuta pela emissão de um evento do tipo get
  * all groups para alertar o usuário de todos os
  * grupos existentes no sistema no momento que
  * o usuário fez a requisição
  */
  socket.on('get all groups', function(callback){
    callback(groups);
  });

  /**
  * Escuta pela emissão de um evento do tipo new
  * group para adicionar um novo grupo na lista
  * de grupos guardados pelo servidor em memória
  */
  socket.on('new group', function(group, callback){
    callback(true);
    socket.group = group;
    groups.push(socket.group);
    updateGroups();
    // fs.writeFile("log.txt", getLogDateTime() +
    // "Cria novo grupo. \n", { flag: 'a' });
  });

  /**
  * Escuta pela emissão de um evento do tipo join
  * group para inserção de um usuário em um
  * determinado grupo requisitado. Dependendo de
  * algumas circunstâncias, pode ser que o usuário
  * que fez a requisição não seja bem vindo naquele
  * grupo ou até mesmo já faça parte daquele grupo.
  * É responsabilidade deste procedimento cuidar para
  * que o usuário só seja adicionado se todos os
  * requisitos para adição forem satisfeitos
  */
  socket.on('join group', function(groupName, userSessionName, callback){
    function groupUserWantsToJoin(group) { return group.name == groupName; }
    var usernameMatch = function(user) { return user == userSessionName; }

    /**/
    // console.log("---");
    // console.log(groupName);
    // console.log(userSessionName);
    // for(var i=0; i<users.length; i++) {
    //   console.log(users[i].admin); }
    // console.log("---");
    /**/

    function userAdminForThatGroup(connection) {
      var admin = groups
        .find(groupUserWantsToJoin)
        .admin;
      return connection.username == admin
    }

    function userNotBannedFromGroup(group) {
      for(var i=0; i<group.bans.length; i++) {
        if(group.bans[i] === userSessionName) {
          return false;
        }
      }
      return true;
     }

    var usrs = groups.find(groupUserWantsToJoin).users;
    var userBelongsToGroup = usrs.some(usernameMatch);

    if(userBelongsToGroup) {
      callback(usrs);
      socket.emit('goto messages', groupName);
      // fs.writeFile("log.txt", getLogDateTime() + "Usuário " +
      // userSessionName + " entrou no grupo " +
      // groupName + ". \n", { flag: 'a' });
    } else {
      if(userNotBannedFromGroup(groups.find(groupUserWantsToJoin))) {
        connections
          .find(userAdminForThatGroup)
          .emit('asked for permission', userSessionName, groupName);
        socket.emit('ask for permission');
        // fs.writeFile("log.txt", getLogDateTime() + "Usuário " +
        // userSessionName + " pediu persmissão para entrar no grupo " +
        // groupName + ". \n", { flag: 'a' });
      } else {
        socket.emit('deny because of ban');
        // fs.writeFile("log.txt", getLogDateTime() + "Usuário " +
        // userSessionName + " queria entrar no grupo " + groupName +
        // " mas não pode pois está banido daquele grupo. \n", { flag: 'a' });
      }
    }
  });

  /**
  * Escuta pela emissão de um evento do tipo aceito
  * que entre por parte do administrador de um dos
  * diversos grupos para que o usuário passado
  * como parâmetro pode ser adicionado ao grupo
  */
  socket.on('aceito que entre' , function(user, group){
    function isUserConnection(connection) { return user === connection.username; }
    function groupUserWillJoin(g) { return group === g.name; }

    var usrs = groups
      .find(groupUserWillJoin).users;

    usrs.push(user);

    // fs.writeFile("log.txt", getLogDateTime() + "Usuário " + user +
    // " foi aceito no grupo " + group + ". \n", { flag: 'a' });

    var userConnection = connections.find(isUserConnection);
    userConnection.emit('me atualizo dos demais do grupo',usrs);
    userConnection.emit('permission accepted');
    userConnection.emit('goto messages', group);

    function userToConnection(u) {
      return connections.find(function(c){ c.username === u });
    }

    var otherUsers = groups
      .find(groupUserWillJoin).users;

    for(var i=0; i<otherUsers.length; i++) {
      if(otherUsers[i] != user) {
        for(var j=0; j<connections.length; j++) {
          if(connections[j].username === otherUsers[i]) {
            connections[j].emit('other user joined this group', user);
          }
        }
      }
    }
  });

  /**
  * Escuta pela emissão de um evento do tipo rejeito
  * que entre por parte do administrador de um dos
  * diversos grupos para que o usuário que requisitou
  * persmissão de acesso tenha esta negada
  */
  socket.on('rejeito que entre', function(user){
    for(var i=0; i<connections.length; i++) {
      if(connections[i].username == user) {
        connections[i].emit('permission rejected');
      }
    }
    // fs.writeFile("log.txt", getLogDateTime() + "Usuário " + user +
    // " foi rejeitado pelo administrador do grupo. \n", { flag: 'a' });
  });

  /**
  * Escuta pela emissão de um evento do tipo delete
  * group para para deletar o grupo alvo. Para que
  * a deleção ocorrá é necessário que o grupo tenha
  * apenas uma pessoa e esta pessoa seja o administrador
  */
  socket.on('delete group', function(groupName, userSessionName, callback){
    var i = null;
    function isGroup(element, index, array) {
      i = index;
      return element.name == groupName ? true : false;
    }
    var grp = groups.find(isGroup);
    if(userSessionName == grp.admin) {
      if(grp.users.length === 1) {
        if(grp.users[0] === userSessionName) {
          if(i != null) {
            groups.splice(i, 1);
          }
          callback(true);
          updateGroups();
          // fs.writeFile("log.txt", getLogDateTime() +
          // "Deleta grupo. \n", { flag: 'a' });
        } else {
          console.log("erro na lógica");
        }
      } else {
        callback(false);
      }
    }
  });

  /**
  * Escuta pela emissão de um evento do tipo get
  * users on this group para que o usuário que acaba
  * de entrar em uma sala de chat possa ter conhecimento
  * dos demais usuários que ali estavam antes
  * dele mesmo ter entrado na sala
  */
  socket.on('get users on this group', function(group, callback){
    function isGroup(element) { return element.name == group ? true : false; }
    var grp = groups.find(isGroup);
    var u = grp.users;
    callback(u);
  });

  /**
  * Escuta pela emissão de um evento do tipo send
  * message para enviar a mensagem especificada para
  * todos os usuários daquele grupo
  */
  socket.on('send message', function(data, group, userSender){
    function isGroup(element) { return element.name == group ? true : false; }

    var userWasAway = false;
    for(var i=0; i<awayUsrs.length; i++) {
      if(awayUsrs[i].user === userSender) {
        userWasAway = true;
        awayUsrs.splice(awayUsrs[i], 1);
      }
    }

    groups
      .find(isGroup).users
      .forEach(function(user) {
        connections.forEach(function(connection) {
          if(connection.username === user) {
            if(userWasAway) {
              connection
                .emit('user no longer away', userSender);
            }
            connection
              .emit('new message', {
                msg: data,
                user: socket.username
              });
          }
        });
      });

    // fs.writeFile("log.txt", getLogDateTime() +
    // "Envia mensagem #{" + data + "} para grupo " +
    // group + ". \n", { flag: 'a' });

    socket.on('group with name', function(group, callback){
      function isGroup(element) {
        if(element.name == group) {
          return true;
        } else {
          return false;
        }
      }

      var grp = groups.find(isGroup);
      callback(grp);
    });
  });

  /**
  * Escuta pela emissão de um evento do tipo private
  * message para transmitir a mensagem para o usuário
  * especificado pelo remetente no terminal
  */
  socket.on('private message', function(userSessionName, userTargetName, msgData){
    function isUserConnection(connection) { return userSessionName === connection.username; }
    function userConnection(connection) { return connection.username == userTargetName; }

    var targetIsAway = false;
    awayUsrs.forEach(function(json) {
      if(json.user === userTargetName) {
        targetIsAway = true;
      }
    });

    if(targetIsAway) {
      var userConnection = connections.find(isUserConnection);
      userConnection.emit('target is away', userTargetName);
    } else {
      connections.find(userConnection).emit(
        'new message', {
          msg: msgData,
          user: userSessionName
        }
      );
    }
  });

  /**
  * Escuta pela emissão de um evento do tipo novo
  * nick para trocar o nome do usuário que requisitou
  * a mudança. O novo nome é passado pelo usuário no
  * momento que ele digitou o comando no terminal
  */
  socket.on('novo nick', function(currentName, newName, callback){
    function userLoged(user) { return user == currentName; }
    function nameInUse(user) { return user == newName; }

    var usernameAlreadyOccupied = users.some(nameInUse);

    if(usernameAlreadyOccupied){
      callback(false);
    } else {
      for(var i=0; i<users.length; i++) {
        if(users[i] === currentName) {
          users[i] = newName;
        }
      }
      for(var i=0; i<connections.length; i++) {
        if(connections[i].username === currentName) {
          connections[i].username = newName;
        }
      }
      for(var i=0; i<groups.length; i++) {
        if(groups[i].admin === currentName) {
          groups[i].admin = newName;
        }
      }
      callback(true, newName);
    }

    // fs.writeFile("log.txt", getLogDateTime() + "Usuário " +
    // currentName + " alterou seu nome para " +
    // newName + ". \n", { flag: 'a' });
  });

  /**
  * Escuta pela emissão de um evento do tipo leave
  * group para retirar o usuário remetente do
  * grupo especificado
  */
  socket.on('leave group', function(userName, groupName, callback) {
    function isGroup(group) {
      return group.name == groupName;
    }

    function notUsername(username) {
      return username != userName;
    }

    groups.find(isGroup).users = groups.find(isGroup).users.filter(notUsername);
    callback(true);

    // fs.writeFile("log.txt", getLogDateTime() +
    // "Usuário " + userName + " saiu do grupo " +
    // groupName + ". \n", { flag: 'a' });
  });

  /**
  * Escuta pela emissão de um evento do tipo ban
  * para banir determinado usuário de determinado
  * grupo. O usuário banido não poderá entrar
  * naquele grupo nunca mais
  */
  socket.on('ban', function(userWhoCommanded, userBan, currentGroup, callback) {
    function isGroup(group) { return group.name === currentGroup; }
    function notUsername(username) { return username != userBan; }
    function userBanConnection(connection) { return connection.username == userBan; }

    var userBanBelongsToGroupUsers = groups.find(isGroup).users.some(
      function(user) {
        return user === userBan;
      }
    );

    if(groups.find(isGroup).admin === userWhoCommanded) {
      if(userBanBelongsToGroupUsers) {
        var con = connections
          .find(userBanConnection);
        groups.find(isGroup).users = groups
          .find(isGroup).users
          .filter(notUsername);
        groups.find(isGroup).bans.push(userBan);
        con.emit('you have been banned');
        callback()
      }
    }

    // fs.writeFile("log.txt", getLogDateTime() + "Usuário " +
    // userBan + " foi banido do grupo " + currentGroup +
    // " pelo administrador " + userWhoCommanded + ". \n", { flag: 'a' });
  });

  /**
  * Escuta pela emissão de um evento do tipo kick
  * para kickar determinado usuário de determinado
  * grupo. O usuário kickado será retirado do grupo
  * que estava mas poderá, posteriormente, requisitar
  * para o administrador a entrada naquele grupo
  */
  socket.on('kick', function(userWhoCommanded, userBan, currentGroup, callback) {
    function isGroup(group) { return group.name === currentGroup; }
    function notUsername(username) { return username != userBan; }
    function userBanConnection(connection) { return connection.username == userBan; }

    var userBanBelongsToGroupUsers = groups.find(isGroup).users.some(
      function(user) {
        return user === userBan;
      }
    );

    if(groups.find(isGroup).admin === userWhoCommanded) {
      if(userBanBelongsToGroupUsers) {
        var con = connections
          .find(userBanConnection);
        groups.find(isGroup).users = groups
          .find(isGroup).users
          .filter(notUsername);
        con.emit('you have been kicked');
        callback(true);
      }
    }

    // fs.writeFile("log.txt", getLogDateTime() + "Usuário " +
    // userBan + " foi kickado do grupo " + currentGroup +
    // " pelo administrador " + userWhoCommanded + ". \n", { flag: 'a' });
  });

  /**
  * Escuta pela emissão de um evento do tipo send
  * file para emitir um arquivo recebido pelo
  * servidor para todos os clientes
  */
  socket.on('send file', function(file) {
    io.sockets.emit('new file', file);
    // fs.writeFile("log.txt", getLogDateTime() +
    // "Arquivo recebido e retransmitido. \n", { flag: 'a' });
  });

  /**
  * Escuta pela emissão de um evento do tipo away
  * para informar outros usuário daquele grupo
  * que o usuário passado por parâmetro não
  * está disponível para conversar
  */
  socket.on('away', function(userName, groupName) {
    function isGroup(g) { return g.name == groupName ? true : false; }

    groups.find(isGroup).users.forEach(function(user){
      connections.forEach(function(con) {
        if(con.username === user) {
          con.emit('user away', userName);
        }
      });
    });

    awayUsrs.push({user: userName, group: groupName});

    // fs.writeFile("log.txt", getLogDateTime() + "Usuário " +
    // userName + " AFK. \n", { flag: 'a' });
  });

  /**
  * Informa a todos os sockets do sistema quais
  * os atuais grupos presentes no servidor
  */
  function updateGroups() {
    io.emit('get groups', groups);
  }

  /**
  * Informa a data e a
  * hora atual atuais
  */
  function getLogDateTime() {
    var dateTime = new Date();
    dateTime = dateTime.toString().substring(0, 24);
    dateTime += ': ';
    return dateTime;
  }
});
