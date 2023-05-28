import { useHttp } from "../../../hooks/http-hook"
import { useState, useCallback, useEffect } from "react"
import { AuthContext } from "../../../context/AuthContext"
import { useContext } from "react"
import { NavLink, useLocation, useParams } from "react-router-dom"
import ItemsListCard from "../../PageComponents/Items/ItemsListCard"
import { t } from "i18next"
import { useTranslation } from "react-i18next";
import { NotificationManager } from "react-notifications"
import ImageViewer from 'react-simple-image-viewer'
import { MagnifyingGlass } from "react-loader-spinner"
import {HubConnectionBuilder, HttpTransportType, HubConnection} from "@microsoft/signalr"

export default function ListItemsPage() {
    const {t} = useTranslation()
    const {id} = useParams()
    const [items, setItems] = useState([])
    const {loading, request} = useHttp()
    const {token} = useContext(AuthContext)
    const [isSearching, setIsSearching] = useState(false)
    const [stats, setStats] = useState([])
    const location = useLocation()
    const [statsLoading, setStatsLoading] = useState(false)
    const [connection, setConnection] = useState(null)
    const [search, setSearch] = useState({
        search: ''
    })
    
    useEffect(()=>{
        return () => {
            window.location.reload()
        }
    },[location])

    useEffect( () => {
        const hubConnection = new HubConnectionBuilder()
        .withUrl("https://inventory-app-aitu.azurewebsites.net/hub/classroom?classroom="+id, { skipNegotiation: true,transport: HttpTransportType.WebSockets})
        .build();

        setConnection(hubConnection)
    }, [])

    useEffect(() => {
        if (connection) {
          connection
            .start()
            .then(() => {
                connection.on("SendAdd", (item) => {
                  // fetchItems()
  
                  
                  setItems(item)
                  fetchStats()
                })
              }).then(() => {
                  connection.on("SendDelete", (item) => {
                      // fetchItems()
                      setItems(item)
  
                      fetchStats()
                      
                    })
              }).then(() => {
                  connection.on("SendUpdate", (item) => {
                      // fetchItems()
                      
                      setItems(item)
  
                      fetchStats()
                  
                    })
              })
              .catch((error) => console.log(error));
        }
      }, [connection]);

    const fetchItems = useCallback(async () => {
        try {
            const fetched = await request('/api/item/classroom/'+id, 'GET', null,  {'Authorization': 'Bearer ' + token})
            setItems(fetched)
        } catch(e){}
    }, [request])

    const fetchStats = useCallback(async () => {
        try {
            setStatsLoading(true)
            const data = await (await fetch('https://inventory-app-aitu.azurewebsites.net/api/classroom/stats/'+id, {method: 'GET', headers: {"Authorization": 'Bearer '+ token}})).json();
             setStats(data)
             setStatsLoading(false)
        } catch(e){}
    }, [request])

    useEffect(() => {
        fetchStats()
    }, [fetchStats])

    const generateReport = async () => {
        try {
            NotificationManager.info(t('Loading...'))
            const response = await request('/api/reports/','POST', {classroom: id}, {'Authorization': 'Bearer ' + token})
            NotificationManager.success(t('You can check your report in profile!'))
        }catch(e) {}
    }

    const [listOfImages,setList] = useState([])
    const [currentImage, setCurrentImage] = useState(0);
     const [isViewerOpen, setIsViewerOpen] = useState(false);
     const openImageViewer = useCallback((index) => {
            setCurrentImage(index);
            setIsViewerOpen(true);
        }, []);
    
        const closeImageViewer = () => {
            setCurrentImage(0);
            setIsViewerOpen(false);
        };


    useEffect(() => {
        fetchItems()
    }, [fetchItems])

    useEffect(()=>{
        searchItems()
    }, [search])

    const searchItems = async () => {
        try{
            if(search.search.length === 0) {
                fetchItems()
                return
            }
            setIsSearching(true)
            const data = await request('/api/item/search/'+id+'/'+search.search,'GET', null, {'Authorization': 'Bearer ' + token})
            setIsSearching(false)
            setItems(data)
        }catch(e){}
    }
    function handleChange(e){
        setSearch({...search, [e.target.name]: e.target.value})
    }
    return (
        <>
        {isViewerOpen && (
        <ImageViewer
          src={ listOfImages }
          currentIndex={ currentImage }
          disableScroll={ true }
          closeOnClickOutside={ true }
          backgroundStyle={{backgroundColor: "rgba(0,0,0,0.8)"}}
          onClose={ closeImageViewer }
        />
      )}
        <div className="list-items-page">
            
            <div className="list-item-buttons">
                <button className="list-item-button-left"><NavLink to={'/admin/listclass'}>{t('Back')}</NavLink></button>
                <button className="list-item-button-right"><NavLink to={'/admin/createitem/' + id} >{t('Add item')}</NavLink></button>
            </div>
            
            <div>
            <input placeholder={t('Search by name')} className = 'list-items-input1' type={'text'} name={'search'} value={search.search} onChange={handleChange}/>
            </div>
            <div>
                <button className="generate-report" onClick={generateReport}>{t('Generate report')}</button>
            </div>
            <p style={{fontSize: '20px'}}>
                {t('Quantity of items per category.')}:
            </p>
            <table style={{minHeight: '200px'}} className="table-container">
                <tr>
                    <th>{t('Name')}</th>
                    <th>{t('Count')}</th>
                </tr>
                
                {!statsLoading && 
                    stats.map(x => <tr>
                        <td style={{textAlign:'center'}}>
                            <b>{x.name}</b>
                        </td>
                        <td style={{textAlign:'center'}}>
                            <b>{x.count}</b>
                        </td>
                    </tr>)
                }
                {statsLoading && <tr><td>{t('Loading...')}</td></tr>}
                {!statsLoading && stats.length === 0 && <div>{t('No information')}</div>}
            </table>

            {(!loading) && <ItemsListCard setList={(data) => setList(data)} openImageViewer={(index) => openImageViewer(index)} reload={fetchItems} items={items} />}
            {(loading && !isSearching) && <div style={{minHeight: '300px'}}>{t('Loading...')}</div>}
            {isSearching &&<h2 style={{maxWidth: '600px', margin: 'auto'}}><MagnifyingGlass
            visible={true}
            height="80"
            width="80"
            ariaLabel="MagnifyingGlass-loading"
            wrapperStyle={{ height: '10em',justifyContent: 'center', alignItems: 'center'}}
            wrapperClass="MagnifyingGlass-wrapper"
            glassColor = '#c0efff'
            color = '#163269'
            /></h2> }
        </div>
        </>
        )
}