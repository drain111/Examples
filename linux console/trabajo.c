/*------------------Métodos que hay que implementar:------------------
--Guardar la información de procesos en un documento
--Guardar historial de comandos (savecommands)
---------------------------------------------------------------------*/
#define BADKEY -1
#define C1 1
#define C2 2
#define C3 3
#define C4 4
#define C5 5
#define C6 6
#define C7 7
#define C8 8
#define C9 9


typedef struct { char *key; int val; } t_symstruct;

static t_symstruct lookuptable[] = {
    {"kill", C1 }, { "killall", C2 }, { "exit", C3 }, {"setWeight",C4}, {"setaffinity",C5}, {"setscheduler",C6}, {"showinfo",C7}, {"createprocess",C8}, {"man",C9}
};

#define NKEYS (sizeof(lookuptable)/sizeof(t_symstruct))

#define _GNU_SOURCE
#include <unistd.h>
#include <stdlib.h>
#include <stdio.h>
#include <fcntl.h>
#include <string.h>
#include <sys/types.h>
#include <sys/time.h>
#include <sys/resource.h>
#include <sched.h>
#include <signal.h>

int *ARRAY_PROCESS;
int *ARRAY_PRIORITIES;
int *PARENT_PROCESS;

static int DIM_ARRAY = 0;
static int argumentos = 0;

int help(char *command) {
      int counter = 0;
      int fd;
      char namefile[80];
      strcpy (namefile,"man/");
      strcat (namefile,command);
      strcat (namefile,".txt");
      
      int caracter;

      fd = open(namefile, O_RDONLY);
 
      while(read(fd, &caracter, sizeof(char))> 0){
        printf("%c", caracter);
      }
      printf("\n");
      close(fd);
}

void setAffinity(int pid, int cpu){
    cpu_set_t set;
    CPU_ZERO(&set);
    CPU_SET(cpu, &set);
    sched_setaffinity(pid, CPU_SETSIZE, &set);
}

int GetCPUCount () {
    int i , count =0;
    cpu_set_t cs;
    CPU_ZERO (&cs);
    sched_getaffinity (0, sizeof (cs), &cs);

    /* Asigna la afinidad del proceso a cs ( todas) */
    for (i = 0; i < sizeof (cs ); i++){
        if ( CPU_ISSET (i , &cs))
            count ++;
    }
    return count ;
}

int setWeight (int pid, int weight) {
    
    const struct sched_param sp ={. sched_priority = weight};
    sched_setscheduler (pid, SCHED_RR ,&sp );
    
    switch( getScheduler(pid) ) {
        case SCHED_OTHER :
            printf("Política tipo CFS, NICE cambiado a %d\n", weight);
            break ;
        case SCHED_RR :
            printf("Política tipo RR, PRIORIDAD cambiado a %d\n", weight);
            break ;
        case SCHED_FIFO :
            printf("Política tipo FIFO, PRIORIDAD cambiada a %d\n", weight);
            break ;
        case -1:
            perror ("ERROR");
            return 0;
    };

    int i = 0;
    for(i; i < DIM_ARRAY; i++){
        if(ARRAY_PROCESS[i] == pid)
            ARRAY_PRIORITIES[i] = weight;
    }
}

void setScheduler(int pid, int policy){
    int i, changedPolicy = 0;
    for(i = 0; i < DIM_ARRAY; i++){
        if(ARRAY_PROCESS[i] == pid){
            const struct sched_param sp ={. sched_priority = ARRAY_PRIORITIES[i]};
            switch (policy){
                case 1:
                    sched_setscheduler (pid, SCHED_OTHER ,&sp );
                    printf("Política cambiada a CFS.\n");
                    changedPolicy = 1;
                    break;
                case 2:
                    sched_setscheduler (pid, SCHED_FIFO ,&sp );
                    printf("Política cambiada a FIFO.\n");
                    changedPolicy = 1;
                    break;
                case 3:
                    sched_setscheduler (pid, SCHED_RR ,&sp );
                    printf("Política cambiada a RR.\n");
                    changedPolicy = 1;
                    break;
                default:
                    printf("ERROR, selecciona una política valida.\n");
                    break;
            };
        }
    }
    if(!changedPolicy) printf("No se ha encontrado el proceso %d\n", pid);
}

int getScheduler (int pid) {
    int policy;
    policy = sched_getscheduler (pid);
    return policy;
}

int showSchedulerInfo (int pid, int i) {
    int policy;
    policy = sched_getscheduler (pid);
    switch( policy ) {
        case SCHED_OTHER :
            printf ("CFS\t| -\t| %d", ARRAY_PRIORITIES[i]); //A diferencia de los de abajo, este muestra el valor NICE
            break ;
        case SCHED_RR :
            printf ("RR\t| %d\t| -", ARRAY_PRIORITIES[i]); //Muestra la prioridad
            break ;
        case SCHED_FIFO :
            printf ("FIFO\t| %dt| -", ARRAY_PRIORITIES[i]);
            break ;
        case -1:
            perror ("ERROR");
    };
    return policy;
}

void showinfo(){
    printf("----------------Información de los procesos en ejecución----------------\n");
    printf("| PID\t| PPID\t| POLY\t| PRIOR\t| NICE\t|\n");
    int ppid;

    int i = 0;
    for(i = 0; i < DIM_ARRAY; i++){
        //Muestra el pid y el ppid del proceso.
        int pid = ARRAY_PROCESS[i];
       ppid = PARENT_PROCESS[i];
        printf("| %d\t| %d\t| ", pid, ppid);
        showSchedulerInfo(pid, i);
        printf("\t|\n");
    }
    printf("------------------------------------------------------------------------\n");
}

void killchild(int pid){

        int finalDim = DIM_ARRAY - 1;
    int *auxArray = calloc(finalDim, sizeof(int));
    int *auxArrayPriorities = calloc(finalDim, sizeof(int));

    int childKIlled = 0;

    int i = 0;
    for(i = 0; i < DIM_ARRAY; i++){
        if(ARRAY_PROCESS[i] == pid){
            kill(ARRAY_PROCESS[i], SIGKILL);
            childKIlled = 1;
        }
        else{        
            auxArray[i - childKIlled] = ARRAY_PROCESS[i]; //Copia el array original en el auxiliar.
            auxArrayPriorities[i - childKIlled] = ARRAY_PRIORITIES[i];
        }
    }

    
    if(childKIlled == 1){
        printf("Se ha acabado con el proceso con PID %d\n", pid);
        free(ARRAY_PROCESS);
        free(ARRAY_PRIORITIES);
        ARRAY_PROCESS = auxArray;
        ARRAY_PRIORITIES = auxArrayPriorities;
        DIM_ARRAY = finalDim;
    }
    else
        printf("No se ha encontrado el proceso con pid %d\n", pid);
}

void killall(){
    int i;
    for(i = 0; i < DIM_ARRAY; i++)
        kill(ARRAY_PROCESS[i], SIGKILL);

    free(ARRAY_PROCESS);
    free(ARRAY_PRIORITIES);
    ARRAY_PROCESS = NULL;
    ARRAY_PRIORITIES = NULL;
    DIM_ARRAY = 0;
}



void esHijo(){
    //Ete método se encarga de que el hijo no vuelva al método main durante un tiempo.
    sleep(999999);

}

void * createp(int n){
     int tubo[2];
    int tubo2[2];
    pipe(tubo);
    pipe(tubo2);
        int finalDim = DIM_ARRAY + n;
        int *auxArray = calloc(finalDim, sizeof(int));
    int *auxArrayPriority = calloc(finalDim, sizeof(int));
    int *auxArrayParent = calloc(finalDim, sizeof(int));
        int parent = 1;
    
    int i = 0;
        for(i = 0; i < DIM_ARRAY; i++){
            auxArray[i] = ARRAY_PROCESS[i]; //Copia el array original en el auxiliar.
        auxArrayPriority[i] = ARRAY_PRIORITIES[i];    
        auxArrayParent[i] = PARENT_PROCESS[i];

        }

    i = 0;
    int id = 0;
    while(parent == 1 && i < n){
        if (fork()!=0){ /* I am the parent*/
        
            }
        else { /* I am the child */
            close(tubo[0]);
         close(tubo2[0]);
                int pid = getpid();
                write(tubo[1], &pid, sizeof(int));
                close(tubo[1]);
             int ppid = getppid();
             write(tubo2[1], &ppid, sizeof(int));
                close(tubo2[1]);
             parent = 0;
                esHijo();
        }
        i++;
    }

    if(parent == 1){
        close(tubo[1]);
     close(tubo2[1]);
        i = DIM_ARRAY;
        int dato;
            while (i < finalDim){
                if(read( tubo[0], &dato, sizeof(int)) > 0){
                auxArray[i] = dato;
                auxArrayPriority[i] = 0;
            
            }
 if(read( tubo2[0], &dato, sizeof(int)) > 0){
                auxArrayParent[i] = dato;            
            }
         i++;

        }
        close(tubo[0]);
        free(ARRAY_PROCESS);
     free(PARENT_PROCESS);
        ARRAY_PROCESS = auxArray;
        ARRAY_PRIORITIES = auxArrayPriority;
     PARENT_PROCESS = auxArrayParent;
        DIM_ARRAY = finalDim;
    }
    else
        exit(0); //Es el hijo, si ha llegado hasta aqui es porque el programa ha estado mucho tiempo abierto y seguramente ha dejado de usarse.

}

char ** obtenercomandos() {
int i=0;
int j=0;
    char linea[100];
char *aux;
char **enviar = malloc(3 * sizeof(char *));
char aux2[100];
int cont = 0;
int cont2 = 0;
fgets(linea, 100, stdin);
aux = strchr(linea, ' ');
for(i=0;i<strlen(linea)-1;i++) {

if((aux-linea) == i ) {

    enviar[cont2] = malloc(cont  * sizeof(char));
    for(j=0;j<=strlen(aux2);j++) enviar[cont2][j] = aux2[j];

    memset(&aux2[0], 0, sizeof(aux2));
    

    cont = 0;
    cont2++;
    aux = strchr(aux+1, ' ');
}
else  {
    aux2[cont] = linea[i];

    cont++;

}
}

enviar[cont2] = malloc(cont + 1 * sizeof(char));
    for(j=0;j<=strlen(aux2);j++) enviar[cont2][j] = aux2[j];

    argumentos = ++cont2;
    return enviar;
}



int hashfunction(char *key) {
int i; 

for (i=0; i < NKEYS; i++) { 
t_symstruct *sym = lookuptable + i; 
printf("key:%s \n", sym->key);
if (strcmp(key, lookuptable[i].key) == 0) return lookuptable[i].val; 
}
return BADKEY;

}



int main(){
        int n, m;
    int i = 0;
    int salida = 0;

    printf("PID del programa: %d\n", getpid());
    printf("Introduzca el numero de procesos que quiere crear: ");
    //scanf("%d", &n);
    createp(4);
    showinfo();
    printf("Introduzca el numero de procesos que quiere crear: ");
    //scanf("%d", &n);
    createp(4);
    showinfo();
    help("help");
    
    //killall();
while(!salida) {
printf("Selecciona lo que quiera hacer: \n");

char **comandos = obtenercomandos();
printf("comando: %s \n", comandos[0]);
switch( hashfunction(comandos[0])) {
        case C1 :
            killchild(atoi(comandos[1]));
            break;
    case C2 :
            killall();
            break;
       case C3 :
            salida=1;
            killall();
            printf("Saliendo de programa");
            break;
        case C9:
            help("help");
            break;
    case BADKEY :
        printf("Comando incorrecto");
        break;

};

for(i=0;i<argumentos;i++) {
    free(comandos[i]);
    comandos[i] = NULL;
}
free(comandos);
comandos = NULL;

}





    //Final del programa
        exit(0);
}



