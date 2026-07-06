<!-- topic: java | title: Conceito 10 — Threads em Java (extra, não cai no exame de C) -->

# Conceito 10 — Threads em Java (Thread, Runnable, sleep/yield, Condições e Locks de Objeto)

As threads em Java não são um objeto físico ou uma coleção de dados, mas sim um fluxo de execução lógico que corre sobre o código do programa. Sendo Java uma linguagem orientada a objetos com suporte nativo a multithreading, a máquina virtual (JVM) integra a gestão de concorrência diretamente no ciclo de vida dos objetos e da memória.

---

## 10.1. Abstração de Thread e Modelos de Criação (`Thread` vs. `Runnable`)

**O Acrónimo Associativo**: **JAVA** (**J**ava **A**ctivity **V**ia **A**lternative-creation).

**A Analogia Gen Z / Vida Real**:
Imagina que vais criar uma playlist de música colaborativa para uma festa com os teus amigos:

- **Extensão de `Thread`**: É o equivalente a comprares um telemóvel novo configurado de fábrica exclusivamente para passar música. O telemóvel físico e o leitor de música são um único bloco de hardware rígido.
- **Interface `Runnable`**: É como criares apenas o link digital partilhado da playlist no Spotify. Podes dar esse link a qualquer amigo para pôr a tocar no telemóvel de qualquer marca. É muito mais flexível e limpo partilhar apenas a playlist (a tarefa/comportamento) do que comprar telemóveis inteiros (instâncias rígidas de thread).

**A Explicação Formal**:
O Java disponibiliza duas abordagens clássicas para definir e executar tarefas concorrentes:

1. **Extensão da Classe `Thread`**: Cria-se uma subclasse que herda de `java.lang.Thread` e sobrepõe-se o método público `run()`. A tarefa concorrente é acionada invocando o método `.start()`, que instrui a JVM a alocar os recursos de sistema e a colocar a thread no estado de pronta (*ready*). *Limitação*: Como o Java não suporta herança múltipla, estender diretamente a classe `Thread` impede que a tua classe herde de qualquer outra superclasse.
2. **Implementação da Interface `Runnable`**: A classe implementa a interface funcional `Runnable`, definindo o comportamento do método `run()`. Para a executar, instancia-se um objeto `Thread` genérico passando o objeto `Runnable` como argumento no construtor (ex: `new Thread(meuRunnable).start()`). É o padrão de desenho recomendado, pois separa a definição da tarefa computacional do mecanismo físico de execução da thread.

*(Mapeado de: ResumoSCOMP.pdf)*

---

## 10.2. Ciclo de Vida e Controlo de Fluxo (`sleep`, `yield` e `join`)

**O Acrónimo Associativo**: **FLOW** (**F**low-control **L**inking **O**perations **W**ithin-threads).

**A Analogia Gen Z / Vida Real**:

- **`sleep`**: Estás a estudar e decides pôr um temporizador no telemóvel para dormir uma sesta de 15 minutos. Tu desligas-te totalmente do mundo por esse período exato e só acordas quando o alarme toca.
- **`yield`**: Estás na fila rápida do supermercado com as compras na mão, vês que a pessoa atrás de ti só tem um chocolate e dizes: "Se o caixa estiver livre, pode passar à minha frente". Tu dás a vez voluntariamente, mas o caixa (o escalonador) pode ignorar a tua sugestão se preferir.
- **`join`**: Estás à espera que o teu amigo chegue com o carro da Uber para irem juntos para a discoteca. Tu ficas parado à porta de casa sem fazer nada até o carro dele encostar fisicamente à berma (esperas de forma bloqueante que a outra thread conclua a sua tarefa).

**A Explicação Formal**:
A gestão de fluxo e transições de estado das threads em Java é controlada por métodos nativos:

- **`Thread.sleep(long millis)`**: Suspende temporariamente a execução da thread corrente pelo período especificado em milissegundos, movendo-a do estado *Running* para o estado *Sleeping/Blocked*. Liberta a CPU mas **não liberta os locks que a thread possua no momento**. Exige o tratamento obrigatório da exceção monitorizada `InterruptedException`.
- **`Thread.yield()`**: Uma sugestão ao escalonador da JVM de que a thread atual está disposta a ceder o seu uso atual do processador para permitir que outras threads de igual prioridade corram. O escalonador é totalmente livre de ignorar esta dica.
- **`join()`**: Permite que uma thread suspenda a sua execução e aguarde de forma bloqueante até que a thread sobre a qual o método foi invocado termine por completo a sua execução. Também responde a interrupções com o lançamento de uma `InterruptedException`.

*(Mapeado de: ResumoSCOMP.pdf)*

---

## 10.3. Interrupção de Threads (`interrupt`, `isInterrupted` e `InterruptedException`)

**O Acrónimo Associativo**: **STOP** (**S**ignal **T**hread **O**rdered **P**reemption).

**A Analogia Gen Z / Vida Real**:
Imagina que estás no quarto a dormir uma sesta pesada com o modo "Não Incomodar" ativo no telemóvel. De repente, há uma emergência em casa e os teus pais começam a bater com força à porta do quarto. Esse estímulo externo quebra o teu sono profundo de forma abrupta, fazendo-te acordar sobressaltado a meio da sesta (**`InterruptedException`**). Tu tens de te levantar de imediato e gerir a situação de emergência de forma ordenada em vez de continuares a dormir.

**A Explicação Formal**:
Em Java, não se devem terminar threads de forma abrupta ou forçada. O mecanismo de término baseia-se num protocolo de cooperação chamado **Interrupção**:

- **`interrupt()`**: Envia um sinal de interrupção à thread-alvo, ativando o seu flag interno de interrupção.
- **`isInterrupted()`**: Método que a thread deve chamar periodicamente para verificar de forma segura se foi solicitado o seu término, permitindo-lhe fechar recursos e sair do método `run()` de forma limpa.
- **`InterruptedException`**: Se a thread-alvo for interrompida enquanto estiver num estado de bloqueio ou suspensão passiva (como dentro de um `sleep()`, `wait()` ou `join()`), a JVM limpa o flag de interrupção e lança instantaneamente esta exceção em runtime, forçando a thread a acordar para tratar o evento.

*(Mapeado de: ResumoSCOMP.pdf)*

---

## 10.4. Armazenamento de Variáveis e Concorrência (Stack vs. Heap)

**O Acrónimo Associativo**: **HEAP** (**H**eap-storage **E**quals **A**ccess **P**roblems).

**A Analogia Gen Z / Vida Real**:

- **Variáveis Locais (Stack)**: São como as notas e rascunhos pessoais que escreves a caneta no teu caderno diário privado. Ninguém na sala consegue ler ou modificar o teu caderno, e quando terminas a aula e o deitas no lixo (a stack frame é destruída), a informação desaparece. É inerentemente seguro contra intrusos (Thread-Safe).
- **Atributos de Objeto (Heap)**: São como os dados desenhados num quadro branco gigante colocado no meio do corredor comum da faculdade. Toda a gente pode passar por lá, ler e escrever por cima ao mesmo tempo. Se tu e o teu colega tentarem desenhar no mesmo canto do quadro em simultâneo, o desenho vai ficar completamente borrado e incompreensível (Race Condition).

**A Explicação Formal**:
A segurança de dados sob execução concorrente em Java depende estritamente do local físico onde as variáveis são armazenadas em memória:

- **Local Variables (Memória Stack)**: Cada thread possui o seu próprio espaço de stack privado. As variáveis locais e os argumentos primitivos das funções são armazenados na stack frame exclusiva de cada invocação, sendo **totalmente invisíveis a outras threads e inerentemente thread-safe**.
- **Object Member Variables / Fields (Memória Heap)**: Os objetos e os seus atributos (variáveis de instância) são armazenados globalmente na memória heap partilhada. Se múltiplas threads acederem concorrentemente à mesma instância de um objeto e modificarem os seus atributos sem sincronização, ocorrerão **condições de corrida** e inconsistência de dados.

*(Mapeado de: ResumoSCOMP.pdf)*

---

## 10.5. Sincronização e Locks de Objeto (`synchronized`)

**O Acrónimo Associativo**: **LOCK** (**L**ocked **O**bject **C**ontrolling **K**oncurrency).

**A Analogia Gen Z / Vida Real**:
Pensa nos provadores de roupa individuais de uma loja da *Zara*. A cabine de provar é o objeto partilhado.

- O provador tem uma cortina com um trinco eletrónico (o Lock intrínseco de objeto).
- No momento em que tu entras para experimentar uma t-shirt, passas o trinco e a luz da porta muda para vermelho (`synchronized`).
- Se um grupo de 10 amigos chegar a correr para usar o mesmo provador, eles batem contra a cortina trancada e são forçados a ficar parados em fila indiana no corredor à espera que tu saias e que a luz volte a ficar verde (eles entram em estado de espera passiva bloqueada pelo lock).

**A Explicação Formal**:
Para garantir a exclusão mútua em zonas críticas, o Java implementa o conceito de monitores:

- **Locks Intrínsecos**: **Todos os objetos em Java possuem um único lock associado**, do qual, num dado instante, no máximo uma única thread pode ser dona (*owner*). Se uma thread tenta adquirir um lock que já está na posse de outra, a thread solicitante é suspensa passivamente pela JVM.
- **Métodos Sincronizados (`synchronized methods`)**: Ao declarar um método como `public synchronized void meuMetodo()`, a thread adquire automaticamente o lock associado à instância do objeto (`this`) antes de iniciar a execução do código interno do método, libertando-o automaticamente quando o método termina ou lança uma exceção.
- **Blocos Sincronizados (`synchronized statements`)**: Permitem um controlo de **granularidade fina (fine-grained)**. Em vez de bloquear o método inteiro, o programador pode trancar apenas uma secção crítica de dados utilizando um objeto específico como lock central (ex: `synchronized(myLock) { ... }`).

*(Mapeado de: ResumoSCOMP.pdf)*

---

## 10.6. Coordenação e Condições de Objecto (`wait`, `notify` e `notifyAll`)

**O Acrónimo Associativo**: **WAIT** (**W**aiting **A**lerting **I**nter-thread **T**ransactions).

**A Analogia Gen Z / Vida Real**:
Imagina que estás num restaurante de *fast food* a aguardar que preparem o teu pedido.
Tu não vais ficar em pé colado ao balcão a perguntar de dois em dois segundos ao cozinheiro se o teu hambúrguer já está pronto (o que seria uma espera ativa ineficiente que enervaria o cozinheiro). Em vez disso, o funcionário entrega-te um pager eletrónico e tu vais sentar-te de forma relaxada num sofá num canto da sala (chamas o método `wait()`, libertando o teu lugar na fila do balcão para que outros clientes possam fazer pedidos). Quando o hambúrguer está pronto, o cozinheiro carrega num botão no balcão que faz o teu pager vibrar (`notify()`). Tu acordas com a vibração, levantas-te do sofá, re-adquires o teu lugar na fila do balcão (re-adquires o lock) e recolhes o teu jantar em segurança.

**A Explicação Formal**:
A comunicação e sincronização condicional direta entre threads em Java é realizada através de métodos nativos da classe ancestral `Object`:

- **`wait()`**: Coloca a thread corrente em estado de espera passiva (*waiting*) na fila de condição do objeto. Esta chamada executa uma operação atómica crucial: **liberta imediatamente o lock do objeto** para permitir que outras threads entrem nas secções sincronizadas e alterem o estado do sistema. A thread permanece suspensa até ser acordada por uma notificação.
- **`notify()`**: Acorda uma única thread aleatória que esteja atualmente na fila de espera do objeto. A thread acordada não retoma a execução imediatamente; ela é movida para a fila de bloqueados para disputar novamente a aquisição do lock do objeto antes de prosseguir.
- **`notifyAll()`**: Acorda simultaneamente todas as threads que estejam suspensas na fila de espera do respetivo objeto. É a abordagem recomendada para evitar *deadlocks* lógicos em situações em que threads diferentes aguardam por condições de estado distintas no mesmo objeto.
- *Regra de Ouro*: As chamadas a `wait()`, `notify()` e `notifyAll()` **só podem ser efetuadas de forma válida de dentro de um contexto sincronizado** (método ou bloco `synchronized`), sob o risco de a JVM lançar a exceção de runtime `IllegalMonitorStateException`.

*(Mapeado de: ResumoSCOMP.pdf)*

---

## 10.7. Exemplo Prático de Exame: ticket selling concorrente em Java (PL06-Ex02)

Para consolidar as threads em Java, analisamos a implementação prática do exercício de venda concorrente de bilhetes protegido por semáforos e sujeito a interrupções voluntárias dos vendedores:

```java
import java.util.concurrent.Semaphore;

public class TicketSeller implements Runnable {
    // Variáveis partilhadas na heap pelos vendedores concorrentes
    private static int availableTickets = 80000; //
    private static final Semaphore sem = new Semaphore(1, true); // Semáforo de exclusão mútua FIFO
    private final int sellerId;

    public TicketSeller(int id) {
        this.sellerId = id;
    }

    @Override
    public void run() {
        // Assegura que o vendedor verifica continuamente se o telemóvel/venda foi interrompido
        while (!Thread.currentThread().isInterrupted()) { 
            try {
                sem.acquire(); // down() passivo do semáforo
                try {
                    if (availableTickets > 0) {
                        availableTickets--;
                        System.out.println("Vendedor " + sellerId + " vendeu 1 bilhete. Restam: " + availableTickets);
                    } else {
                        // Se não houver mais bilhetes, o vendedor pode parar de trabalhar
                        break;
                    }
                } finally {
                    sem.release(); // up() atómico para garantir que o trinco abre sempre no final
                }
                
                // Simulação curta de trabalho local fora da secção crítica
                Thread.sleep(10); //
                
            } catch (InterruptedException e) {
                // Se o vendedor for interrompido a meio do sleep, limpa recursos e desliga ordenadamente
                System.out.println("Vendedor " + sellerId + " foi interrompido com sucesso!");
                break;
            }
        }
    }
}
```
