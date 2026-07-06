<!-- topic: threads | title: Conceito 07 — Threads em C (pthreads, mutexes, condition variables) -->

# Conceito 7 — Threads em C (Lightweight Concurrency, Mutexes, Condition Variables, Thread Safety e Reentrância)

As threads representam a base da concorrência moderna dentro de um único processo, permitindo que tarefas corram de forma paralela e partilhem recursos de forma extremamente rápida, mas exigindo um cuidado redobrado na sincronização para evitar bugs indetetáveis.

---

## 7.1. Abstração de Thread: Threads vs. Processos

**O Acrónimo Associativo**: **LITE** (**L**ightweight **I**nstruction **T**hread **E**xecution).

**A Analogia Gen Z / Vida Real**:
Imagina que estás a usar o teu browser (como o Google Chrome ou o Safari). O browser em si, aberto no teu computador, é um **Processo**. Cada aba (tab) que tens aberta é uma **Thread**.
Todas as abas partilham a mesma ligação à Internet, usam a mesma placa de som para reproduzir áudio e partilham a memória global da aplicação (elas partilham o mesmo espaço de endereçamento, heap e recursos de kernel). No entanto, cada aba tem a sua própria história de navegação independente, o seu próprio cursor e sabe exatamente em que linha de texto estás a ler agora (cada thread tem o seu próprio program counter, registos e uma stack privada). Se o browser for fechado abruptamente (o processo pai morre), todas as abas desaparecem instantaneamente do ecrã.

**A Explicação Formal**:
Uma thread é uma sequência ou fluxo de execução lógico independente dentro de um processo. Enquanto a criação de processos através de `fork()` exige duplicar toda a estrutura do processo (incluindo tabelas de descritores, memória virtual e contexto do PCB), o que acarreta um elevado custo computacional (overhead), as threads são unidades de execução leves.

- **Recursos Partilhados**: Todas as threads pertencentes ao mesmo processo partilham obrigatoriamente o mesmo espaço de endereçamento virtual (o segmento de código, a memória heap e variáveis globais) e os recursos do sistema (como descritores de ficheiros abertos, sockets e sinais).
- **Recursos Privados**: Para viabilizar a execução concorrente, cada thread mantém o seu próprio identificador único (Thread ID), o estado dos registos da CPU (incluindo o program counter para saber qual a próxima instrução a executar) e um espaço de stack privado para gerir as suas variáveis locais e chamadas de funções.
- **Estrutura**: Ao contrário dos processos, não existe qualquer relação hierárquica (como pai-filho) entre threads, mesmo que tenham sido criadas pela mesma thread principal (*main thread*).

*(Mapeado de: SCOMP2425-TP11.pdf, SCOMP2425-TP12.pdf, SCOMP2526-T9.pdf e ResumoSCOMP.pdf)*

---

## 7.2. Criação e Gestão de Threads em C (`pthread_create`, `pthread_join`, `pthread_exit`)

**O Acrónimo Associativo**: **JOIN** (**J**ob **O**perations **I**ntegrating **N**etwork).

**A Analogia Gen Z / Vida Real**:
Imagina que estás a organizar um jantar de grupo com amigos.

- `pthread_create`: Tu delegas (contratas) um amigo para ir buscar a comida à rua. Ele afasta-se do grupo principal e começa a caminhar de forma paralela (executa a sua própria rotina).
- `pthread_exit`: Ele chega ao restaurante, recolhe os hambúrgueres e coloca-os numa caixa térmica (aloca memória na heap e termina a sua tarefa). Se ele decidir apontar o código de recolha do pedido na palma da mão dele (variável local na stack dele) e depois for lavar as mãos (a stack da thread é destruída no término), tu nunca vais conseguir ler o código porque a informação foi apagada. Os dados têm de ser explicitamente guardados na caixa térmica global (heap).
- `pthread_join`: Tu ficas parado à porta de casa à espera que o teu amigo volte. Só quando ele chega com a comida é que tu podes prosseguir com o jantar.

**A Explicação Formal**:
A nível de código em C em ambientes UNIX/Linux, a programação multithread utiliza a biblioteca de threads POSIX (`<pthread.h>`), sendo obrigatório ligar a biblioteca durante a compilação através da flag de compilador `-lpthread`. As principais funções de controlo do ciclo de vida são:

1. `int pthread_create(pthread_t *thread, const pthread_attr_t *attr, void *(*start_routine) (void *), void *arg)`: Cria uma nova thread que inicia a sua execução concorrente na função apontada por `start_routine`, passando o argumento genérico `arg` (através de um ponteiro de tipo `void*`).
2. `void pthread_exit(void *retval)`: Termina de forma controlada a execução da thread corrente, disponibilizando um ponteiro de retorno `retval` para outras threads. *Questão Crítica de Memória*: Como a stack é libertada e o seu espaço é reutilizado pelo sistema após o término da thread, aceder a variáveis locais criadas na stack da thread terminada resulta num comportamento indefinido. Por segurança, dados de retorno complexos devem ser obrigatoriamente alocados na memória heap (utilizando `malloc()`) antes da saída.
3. `int pthread_join(pthread_t thread, void **retval)`: Bloqueia a thread chamadora até que a thread especificada pelo ID termine, recolhendo em `retval` o ponteiro de retorno configurado na chamada `pthread_exit()`.
4. `pthread_t pthread_self(void)`: Retorna o ID único da thread chamadora (este ID é único apenas dentro do mesmo processo).

*(Mapeado de: SCOMP Reference Sheet.pdf, SCOMP2425-TP12.pdf, SCOMP2526-T9.pdf e ResumoSCOMP.pdf)*

---

## 7.3. Sincronização com Mutexes

**O Acrónimo Associativo**: **LOCK** (**L**ocking **O**bject **C**ontrolling **K**ernel-access).

**A Analogia Gen Z / Vida Real**:
Imagina que partilhas um apartamento de estudantes e só há uma casa de banho com uma tomada ideal para usar o secador de cabelo (o recurso partilhado na secção crítica). O **Mutex** é o trinco físico da porta da casa de banho.

- **Lock (Bloquear)**: Tu entras, fechas a porta e passas o trinco para a posição vermelha. Se o teu colega tentar entrar, bate contra a porta trancada (fica retido e bloqueado passivamente, sem consumir energia útil).
- **Unlock (Desbloquear)**: Quando terminas de secar o cabelo, abres o trinco e sales. O teu colega que estava à espera pode finalmente entrar e trancar a porta para si.

**A Explicação Formal**:
Um **Mutex (Mutual Exclusion lock)** é um objeto de sincronização binário fornecido pela biblioteca de threads que controla o acesso exclusivo a recursos partilhados em secções críticas de código. O seu estado interno é sempre representado de forma atómica como `0` (trancado/bloqueado) ou `1` (aberto/destrancado).

- `pthread_mutex_init(pthread_mutex_t *mutex, ...)` e `pthread_mutex_destroy(pthread_mutex_t *mutex)`: São responsáveis pela inicialização e remoção segura do objeto na memória do processo.
- `pthread_mutex_lock(pthread_mutex_t *mutex)`: Solicita a tranca da secção crítica. Se o mutex estiver destrancado (`1`), a thread altera o valor para `0` atómicamente e continua de imediato. Se já estiver ocupado por outra thread (`0`), a thread chamadora é suspensa passivamente pelo sistema operativo, libertando a CPU até que o recurso seja libertado.
- `pthread_mutex_unlock(pthread_mutex_t *mutex)`: Liberta a tranca, restaurando o valor para `1` e acordando uma das threads que estavam bloqueadas em espera. A biblioteca garante que apenas a thread que efetuou a tranca (*owner*) pode destrancá-la de forma válida.

*(Mapeado de: SCOMP Reference Sheet.pdf, SCOMP2425-TP12.pdf e ResumoSCOMP.pdf)*

---

## 7.4. Variáveis de Condição (Condition Variables) e o Dilema "While vs. If"

**O Acrónimo Associativo**: **WAIT** (**W**akeup **A**fter **I**ntermediate **T**rigger).

**A Analogia Gen Z / Vida Real**:
Imagina que compraste um casaco de edição limitada numa plataforma de revenda (como a *Vinted* ou a *StockX*). Tu não queres ficar a olhar para o ecrã do telemóvel a fazer refresh (espera ativa/spinning) a cada segundo para saber quando é que o vendedor envia a encomenda. Em vez disso, usas as notificações da aplicação (as Variáveis de Condição).
Tu carregas no botão "Notificar-me" (`pthread_cond_wait()`). O teu telemóvel entra em modo de suspensão profunda (libertas o mutex e ficas bloqueado). Quando o vendedor finalmente despacha o casaco, a app envia-te um push notification (`pthread_cond_signal()`).
Tu acordas com o sinal, mas antes de saíres a correr de pijama para a caixa de correio, deves **sempre verificar se a encomenda está lá mesmo dentro de um ciclo `while`**. Porquê? Porque o carteiro pode ter feito um alarme falso, ou o teu irmão pode ter ido à caixa de correio primeiro do que tu e levado o casaco sem te avisar. Se usares apenas um `if`, podias ir abrir a caixa de correio vazia e tentar agarrar um casaco inexistente, corrompendo a lógica da tua casa.

**A Explicação Formal**:
As **Variáveis de Condição (Condition Variables)** são primitivas que permitem que as threads adormeçam de forma passiva, aguardando que uma determinada condição lógica (expressa sobre variáveis partilhadas) se torne verdadeira.

- `pthread_cond_wait(pthread_cond_t *cond, pthread_mutex_t *mutex)`: Bloqueia a thread chamadora na fila de espera da condição. Esta chamada executa uma operação **atómica** crucial: **liberta o mutex associado** (permitindo que outras threads acedam à secção crítica para alterar as variáveis) e suspende a thread. No momento em que a thread é acordada por um sinal, ela require obrigatoriamente o mutex antes de sair da função.
- `pthread_cond_signal(pthread_cond_t *cond)`: Acorda pelo menos uma thread que esteja bloqueada em espera na variável de condição. Ao contrário dos semáforos, as notificações não são acumuladas; se nenhuma thread estiver suspensa, o sinal é perdido.
- `pthread_cond_broadcast(pthread_cond_t *cond)`: Desbloqueia e acorda simultaneamente todas as threads retidas na variável de condição.
- **A Regra Crítica do Ciclo `while`**: Uma thread acordada nunca deve assumir cegamente que a condição lógica foi cumprida. A avaliação deve ser efetuada obrigatoriamente dentro de um ciclo `while` e **nunca de um `if`**. Isto deve-se a:
- **Spurious Wakeups (Acordares Espúrios)**: O sistema operativo pode, por comportamento interno de agendamento de baixo nível, acordar a thread sem que nenhum sinal real tenha sido enviado.
- **Modificações Concorrentes**: Outra thread concorrente pode ter sido escalonada primeiro após o sinal, reavendo o mutex e alterando as variáveis partilhadas de volta para um estado inválido antes de a thread acordada conseguir retomar a sua execução.

```c
pthread_mutex_lock(&mutex);
while (buffer_empty) { // SEMPRE while, nunca if!
    pthread_cond_wait(&cond, &mutex);
}
// Consumir dados em segurança...
pthread_mutex_unlock(&mutex);
```

*(Mapeado de: SCOMP Reference Sheet.pdf, SCOMP2425-TP12.pdf e ResumoSCOMP.pdf)*

---

## 7.5. Reentrância (Reentrancy) vs. Segurança Concorrente (Thread-Safety)

**O Acrónimo Associativo**: **SAFE** (**S**ecure **A**ccess **F**ree of **E**rrors).

**A Analogia Gen Z / Vida Real**:
Imagina um bot de Discord ou Telegram que calcula a tua nota de SCOMP:

- **Thread-Safe com trancas**: O servidor do bot tem apenas um ficheiro de texto global onde escreve temporariamente a tua nota e depois calcula. Se duas pessoas usarem o bot ao mesmo tempo, ele tem de usar um **Mutex** para trancar o ficheiro global. O utilizador B tem de ficar em fila de espera (atraso de sincronização) enquanto o utilizador A está a calcular. É seguro, mas lento.
- **Reentrante (totalmente isolado)**: O bot foi programado sem guardar qualquer estado em ficheiros globais ou variáveis estáticas do servidor. Toda a informação que tu envias (os teus argumentos) entra diretamente na função, gera variáveis temporárias na memória RAM privada daquela mensagem e devolve o resultado. Se 10.000 pessoas usarem o bot no mesmo milissegundo, não há filas de espera nem conflitos, porque nenhuma chamada toca na memória das outras.

**A Explicação Formal**:

- **Thread-Safe (Segura para Threads)**: Uma função diz-se segura para threads se puder ser chamada simultaneamente por múltiplos fluxos de execução concorrentes sem que ocorram condições de corrida ou corrupção de dados. Uma função pode ser tornada thread-safe protegendo internamente os seus acessos a variáveis globais ou estáticas através de locks (como mutexes).
- **Reentrante (Reentrant)**: Uma função diz-se reentrante se puder ser interrompida a meio da sua execução (por exemplo, por uma rotina de tratamento de sinal ou por outra thread) e voltar a ser chamada de forma concorrente sem que ocorra qualquer efeito secundário indesejado.
- **Diferenças de Desenho**: Para que uma função seja reentrante, ela **não pode aceder a qualquer tipo de estado global, buffers estáticos partilhados ou dados mutáveis não-locais**. Toda a sua computação deve assentar estritamente nas variáveis locais alocadas na stack privada de cada chamada (ou argumentos passados por valor).
- **A Relação Hierárquica**: **Todas as funções reentrantes são thread-safe, mas nem todas as funções thread-safe são reentrantes**. Por exemplo, uma função que utiliza um mutex para alterar de forma exclusiva uma variável global é considerada thread-safe, mas **não é reentrante** (se for interrompida a meio por um sinal que tente chamar a mesma função, o programa entrará em deadlock instantâneo ao tentar re-adquirir o mesmo mutex).

*(Mapeado de: SCOMP2526-T9.pdf, SCOMP2526-T5.pdf e SCOMP2526-T10.pdf)*
