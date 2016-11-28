
/*-------------------------------------------------------------------
  ------------------ADSMINISTRADOR DE PROCESOS LINUX-----------------
  -------------------------------------------------------------------*/
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
#define C10 10

typedef struct { char *key; int val; } t_symstruct;

//Comandos disponibles:
static t_symstruct lookuptable[] = {
    {"kill", C1 }, { "killall", C2 }, { "exit", C3 }, {"setpriority",C4}, {"setaffinity",C5}, {"setscheduler",C6}, {"showinfo",C7}, {"createprocess",C8}, {"man",C9}, {"setnice", C10}
};

#define NKEYS (sizeof(lookuptable)/sizeof(t_symstruct))



int *ARRAY_PROCESS;
int *ARRAY_PRIORITIES;
int *PARENT_PROCESS;

static int DIM_ARRAY = 0;
static int argumentos = 0;

/*--------------------------------------
	MÉTODO PARA LIMPIAR LA PANTALLA
----------------------------------------*/
void clear(){
	if(fork() != 0)
		wait();
	else
		execlp("clear", "clear", NULL);
}


/*--------------------------------------
	MÉTODO PARA COMPROBAR SI UN PROCESO EXISTE FUERA DEL PROGRAMA
----------------------------------------*/
int exists(int pid){
	if(kill(pid, 0) == 0)
		return 1;
	
	return 0;
	
}

/*--------------------------------------
	MÉTODO PARA COMPROBAR SI UN PROCESO EXISTE DENTRO DEL PROGRAMA
----------------------------------------*/
int existsInArray(int pid){
	int i;	
	for(i = 0; i < DIM_ARRAY; i++){
		if(ARRAY_PROCESS[i] == pid)
			return i;
	}
	return -1;
}



/*--------------------------------------
	MÉTODO PARA LOS MANUALES
----------------------------------------*/
int help(char *command) {
	int fd;
	char namefile[80];
	strcpy (namefile,"man/");

	if(command == "") strcat (namefile,"man");
	else strcat (namefile,command);

	strcat (namefile,".txt");
	      
	int caracter;

	fd = open(namefile, O_RDONLY);
	
	
	while(read(fd, &caracter, sizeof(char))> 0){
		printf("%c", caracter);
	}
	printf("\n");
		
	
	close(fd);
}

/*--------------------------------------
	MÉTODO PARA CAMBIAR LA AFINIDAD
----------------------------------------*/
void setAffinity(int pid, int cpu){
	if(exists(pid) == 1){	
		cpu_set_t set;
		CPU_ZERO(&set);
		CPU_SET(cpu, &set);
		sched_setaffinity(pid, CPU_SETSIZE, &set);
	}
}


/*--------------------------------------
	MÉTODO PARA OBTENER EL NÚMERO DE CPUS
----------------------------------------*/
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

/*--------------------------------------
	MÉTODO PARA CAMBIAR LA PRIORIDAD
----------------------------------------*/
int setWeight (int pid, int weight) {
    	
	int inProgram = existsInArray(pid);
	
	const struct sched_param sp ={. sched_priority = weight};

	switch( getScheduler(pid) ) {
		case SCHED_OTHER :
			printf("Política tipo CFS.\n");
			break ;

		case SCHED_RR :
			sched_setscheduler (pid, SCHED_RR ,&sp );
			printf("Política tipo RR, PRIORIDAD cambiada a %d\n", weight);
			break ;

		case SCHED_FIFO :
			sched_setscheduler (pid, SCHED_FIFO ,&sp );
			printf("Política tipo FIFO, PRIORIDAD cambiada a %d\n", weight);
			break ;

		case -1:
			perror ("ERROR");
			return 0;
	};

	if(inProgram >= 0)
		ARRAY_PRIORITIES[inProgram] = weight;
	else
		printf("El proceso estaba fuera del programa principal.\n");
}

/*--------------------------------------
	MÉTODO PARA CAMBIAR LA POLÍTICA DE PLANIFICACIÓN
----------------------------------------*/
void setScheduler(int pid, int policy){
    
    if(exists(pid) == 1) { //Si el proceso existe, cambiar la prioridad
	int priority = 0;
	if(policy != 1)
		priority = 99;
	
	int i =	existsInArray(pid);
	
	if (i == -1)
		printf("Proceso fuera del programa principal.\n");
	else{
		priority = 0;
		if(ARRAY_PRIORITIES[i] == 0 && policy > 1){
			priority = 99;
			ARRAY_PRIORITIES[i] = priority;
		}

		if(ARRAY_PRIORITIES[i] > 0 && policy == 1){
			priority = 0;
			ARRAY_PRIORITIES[i] = priority;
		}
		if(ARRAY_PRIORITIES[i] > 0 && policy > 1)
			priority = ARRAY_PRIORITIES[i];
	}
	const struct sched_param sp ={. sched_priority = priority};
    	switch (policy){
	        case 1:
	    
	            sched_setscheduler (pid, SCHED_OTHER ,&sp );
	            printf("Política cambiada a CFS.\n");
	            break;
	        case 2:
	            sched_setscheduler (pid, SCHED_FIFO ,&sp );
	            printf("Política cambiada a FIFO.\n");
	            break;
	        case 3:
	            sched_setscheduler (pid, SCHED_RR ,&sp );
	            printf("Política cambiada a RR.\n");
	            break;
	        default:
	            printf("ERROR, ha habido algún problema al cambiar la política o no se ha seleccionado una valida.\n");
	            break;
	};
    }
    else printf("No se ha encontrado el proceso con PID: %d\n", pid);
}

/*--------------------------------------
	MÉTODO PARA OBTENER LA POLÍTICA DE PLANIFICACIÓN
----------------------------------------*/
int getScheduler (int pid) {
    int policy;
    policy = sched_getscheduler (pid);
    return policy;
}

/*--------------------------------------
	MÉTODO PARA MOSTRAR LA POLÍTICA DE PLANIFICACIÓN
----------------------------------------*/
int showSchedulerInfo (int pid, int i) {
	int policy;
	policy = sched_getscheduler (pid);

	switch( policy ) {
		case SCHED_OTHER :
			printf ("CFS\t| %d\t| - ", getnice(pid)); //A diferencia de los de abajo, este muestra el valor NICE
			break ;

		case SCHED_RR :
			printf ("RR\t| %d\t| %d ", getnice(pid), ARRAY_PRIORITIES[i]); //Muestra la prioridad
			break ;

		case SCHED_FIFO :
			printf ("FIFO\t| %d\t| %d ", getnice(pid), ARRAY_PRIORITIES[i]);
			break ;

		case -1:
			perror ("ERROR\t| -\t| -\t ");
	};

	return policy;
}

/*--------------------------------------
	MÉTODO PARA PONER EL VALOR DE NICE
----------------------------------------*/
void setnice(int pid, int valor) {

	if(getScheduler(pid) == SCHED_OTHER) {
		int change = 1;
		if(existsInArray(pid) == -1)
			printf("El proceso está fuera del programa.\n");
		if(exists(pid) == 0){
			printf("No existe el proceso.\n");
			change = 0;
		} 
		if(change == 1) {
			setpriority(PRIO_PROCESS, pid, valor);
			printf("Nice value: %d \n",getnice(pid, valor));
		}
	}
	else {
		printf("La política de planificación del proceso no es CFS. No se puede cambiar el valor de NICE.\n");
	}
}

/*--------------------------------------
	MÉTODO PARA OBTENER EL VALOR DE NICE
----------------------------------------*/
int getnice(int pid) {
	int nice = getpriority(PRIO_PROCESS, pid);
	return nice;
}

/*--------------------------------------
	MÉTODO PARA MOSTRAR LA INFORMACIÓN COMPLETA DE UN PROCESO
----------------------------------------*/
void showinfo(int pid){
	int arrayPosition = existsInArray(pid);
	int search = 1;
	


	
	if(arrayPosition == -1){
		search = exists(pid);
		if(search == 1)
			printf("Proceso fuera del programa principal\n");
	}

	printf("---------------Información del proceso %d---------------\n", pid);

	
	if(search == 1){
		if(fork()!= 0){
			wait();
		}
		else{
			char namefile[17];
			char str[10];

			sprintf(str, "%d", pid);   
			strcpy (namefile,"/proc/");
			strcat (namefile,str);
			strcat (namefile,"/status");

			execlp("cat","cat",namefile,NULL);
			    
			exit(0);
		}
	}
	else
		printf("Proceso %d no encontrado.\n", pid);
	
	    
	printf("------------------------------------------------------------\n");
}

/*--------------------------------------
	MÉTODO PARA MOSTRAR LA INFORMACIÓN BÁSICA DE TODOS LOS PROCESOS HIJOS
----------------------------------------*/
void showbasic(){
	printf("-------Información de los procesos-------\n");
	printf("| PID\t| PPID\t| POLI\t| NICE\t| PRIOR\t|\n");
	printf("-----------------------------------------\n");

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
	printf("-----------------------------------------\n");
}

/*--------------------------------------
	MÉTODO PARA MATAR UN PROCESO HIJO
----------------------------------------*/
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

/*--------------------------------------
	MÉTODO PARA MATAR TODOS LOS PROCESOS HIJOS
----------------------------------------*/
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


/*--------------------------------------
	MÉTODO PARA LOS HIJOS
----------------------------------------*/
void esHijo(int ppid){
    	//Este método se encarga de que el hijo entre en un bucle infinito.
	while(1) {
 		if(getppid() != ppid) exit(0);
	}
}

/*--------------------------------------
	MÉTODO PARA CREAR N HIJOS
----------------------------------------*/
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
			esHijo(getppid());
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
		close(tubo2[0]);
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

/*--------------------------------------
	MÉTODO PARA OBTENER LOS COMANDOS DE CONSOLA
----------------------------------------*/
char ** obtenercomandos() {
	int i=0;
	int j=0;
	char linea[100];
	for(i=0; i<100;i++)
		linea[i] = '\0';
	
	char **enviar = malloc(4 * sizeof(char));
	int cont = 0;
	int cont2 = 0;
	int espacio= 0;
	fflush ( stdout );
	fflush ( stdin );
	fgets(linea, 1001, stdin);

	for(i=0;i<strlen(linea);i++) {
		if(cont2 < 3){
			if(linea[i] == ' ') {
				enviar[cont2] = malloc((cont + 1) * sizeof(char));

				for(j=espacio;j<cont+espacio;j++){
					enviar[cont2][j-espacio] = linea[j];
				}
				enviar[cont2][j] = '\0';
				cont2++;
				espacio = cont+espacio+1;
				cont = 0;
			}
			else{
				cont++;
			}
		}
		
	}
	if(cont2 < 3) {
		enviar[cont2] = malloc((cont + 1) * sizeof(char));

		for(j=espacio;j<strlen(linea);j++){
			if (linea[j] == '\n')
			linea[j] = '\0';

			enviar[cont2][j-espacio] = linea[j];
		}
		espacio = cont+1;
		cont = 0;
	    
		argumentos = cont2++;
	}
	else argumentos = cont2;
	return enviar;
}

/*--------------------------------------
	MÉTODO PARA COMPARAR SI UN COMANDO DE ENTRADA ESTÁ EN LA TABLA DE COMANDOS
----------------------------------------*/
int hashfunction(char *key) {
	int i;
	for (i=0; i < NKEYS; i++) {
		if (strcmp(key, lookuptable[i].key) == 0) 
			return lookuptable[i].val;
	}
	return BADKEY;
}

/*--------------------------------------
	MÉTODO PRINCIPAL
----------------------------------------*/
int main(){
	int i = 0;
	int salida = 0;
	int started = 0;
	    
	while(!salida) {
		if(started == 0){
			clear();
			help("inicio");
			createp(5);
			//showbasic();
			started = 1;
		}		
		showbasic();
		printf("Selecciona lo que quiera hacer: \n");
		char **comandos = obtenercomandos();
		clear();

		switch( hashfunction(comandos[0])) {
			case C1 :
				killchild(atoi(comandos[1]));
				break;

			case C2 :
				killall();
				break;

			case C3 :
				salida=1;
				clear();
				killall();
				printf("Saliendo de programa.\n");
				break;

			case C4 :
				setWeight(atoi(comandos[1]), atoi(comandos[2]));
				break;

			case C5:
				setAffinity(atoi(comandos[1]), atoi(comandos[2]));
				break;

			case C6:
				setScheduler(atoi(comandos[1]), atoi(comandos[2]));
				break;

			case C7:
				if(argumentos > 0)
					showinfo(atoi(comandos[1]));
				else
					showbasic();
				break;

			case C8:
				createp(atoi(comandos[1]));
				break;

			case C9:
				if(argumentos == 0)
					help("");
				else
					help(comandos[1]);
				break;

			case C10:
				setnice(atoi(comandos[1]), atoi(comandos[2]));
				break;

			case BADKEY :
				printf("Comando incorrecto.\n");
				break;

		};
		
		for(i=0;i<=argumentos;i++) {
			free(comandos[i]);
			comandos[i] = NULL;
		}
		comandos = NULL;
	}
	//Final del programa
	exit(0);
}












